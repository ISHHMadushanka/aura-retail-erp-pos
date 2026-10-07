import { db } from './db/store';
import {
  CartItem, CashSession, Customer, PaymentEntry, Product, Sale, User
} from '../types/erp';
import { InventoryService } from './inventoryService';
import { PromotionService } from './promotionService';
import { AuditService } from './auditService';

export class PosService {
  /**
   * Find product by primary barcode, additional barcodes, or SKU
   */
  public static lookupProduct(term: string): Product | undefined {
    const clean = term.trim().toLowerCase();
    const products = db.collection('products').find();
    return products.find((p: Product) => 
      p.isActive && (
        p.barcode.toLowerCase() === clean ||
        p.sku.toLowerCase() === clean ||
        (p.additionalBarcodes && p.additionalBarcodes.some(b => b.toLowerCase() === clean))
      )
    );
  }

  /**
   * Recompute cart totals including promotions, taxes, and net totals
   */
  public static calculateCart(items: CartItem[]): {
    items: CartItem[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    appliedPromotions: string[];
  } {
    const { evaluatedItems, billDiscountTotal, appliedPromotions } = PromotionService.evaluateCart(items);

    const subtotal = evaluatedItems.reduce((acc, it) => acc + (it.unitPrice * it.quantity), 0);
    const itemDiscounts = evaluatedItems.reduce((acc, it) => acc + it.discountAmount, 0);
    const discountTotal = Number((itemDiscounts + billDiscountTotal).toFixed(2));
    const taxTotal = evaluatedItems.reduce((acc, it) => acc + it.taxAmount, 0);
    const grandTotal = Math.max(0, Number((subtotal - discountTotal + taxTotal).toFixed(2)));

    return {
      items: evaluatedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountTotal,
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal,
      appliedPromotions
    };
  }

  /**
   * Process and finalize a POS sale transaction
   */
  public static async completeSale(params: {
    companyId: string;
    branchId: string;
    warehouseId: string;
    terminalId: string;
    cashSessionId: string;
    cashier: User;
    customer?: Customer;
    items: CartItem[];
    payments: PaymentEntry[];
    amountTendered: number;
    pointsToRedeem?: number;
  }): Promise<Sale> {
    if (!params.items.length) {
      throw new Error('Cannot complete sale with an empty cart');
    }

    const { subtotal, discountTotal, taxTotal, grandTotal } = this.calculateCart(params.items);

    const totalPaid = params.payments.reduce((acc, p) => acc + p.amount, 0);
    if (totalPaid < grandTotal) {
      throw new Error(`Insufficient payment. Expected ${grandTotal.toFixed(2)}, received ${totalPaid.toFixed(2)}`);
    }

    const changeGiven = Number((params.amountTendered - grandTotal).toFixed(2));

    return await db.runInTransaction(async () => {
      const saleNumber = `INV-${params.branchId.toUpperCase().slice(-3)}-${Date.now().toString().slice(-6)}`;
      
      // Calculate loyalty points
      let pointsEarned = 0;
      let pointsRedeemed = params.pointsToRedeem || 0;

      if (params.customer) {
        // e.g. 1 point per 100 spent
        pointsEarned = Math.floor(grandTotal / 100);
        const updatedPoints = Math.max(0, params.customer.loyaltyPoints - pointsRedeemed + pointsEarned);
        const updatedTotalSpent = Number((params.customer.totalSpent + grandTotal).toFixed(2));

        db.collection('customers').updateOne(
          (c: Customer) => c.id === params.customer!.id,
          {
            loyaltyPoints: updatedPoints,
            totalSpent: updatedTotalSpent
          }
        );
      }

      const sale: Sale = {
        id: 'sale_' + Math.random().toString(36).substr(2, 9) + Date.now(),
        saleNumber,
        companyId: params.companyId,
        branchId: params.branchId,
        warehouseId: params.warehouseId,
        terminalId: params.terminalId,
        cashSessionId: params.cashSessionId,
        cashierId: params.cashier.id,
        cashierName: params.cashier.fullName,
        customerId: params.customer?.id,
        customerName: params.customer?.fullName,
        items: params.items,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        payments: params.payments,
        amountTendered: params.amountTendered,
        changeGiven: Math.max(0, changeGiven),
        status: 'COMPLETED',
        pointsEarned,
        pointsRedeemed,
        createdAt: new Date().toISOString()
      };

      db.collection('sales').insertOne(sale);

      // Decrement inventory via double-entry stock transactions
      for (const item of params.items) {
        const product = db.collection('products').findById(item.productId);
        InventoryService.recordMovement({
          companyId: params.companyId,
          branchId: params.branchId,
          warehouseId: params.warehouseId,
          productId: item.productId,
          quantityChange: -item.quantity,
          transactionType: 'POS_SALE',
          referenceType: 'SALE',
          referenceId: sale.saleNumber,
          unitCost: product ? product.costPrice : item.unitPrice * 0.7,
          notes: `POS Terminal Sale ${sale.saleNumber}`,
          user: params.cashier
        });
      }

      // Update Cash Session totals
      const cashPayments = params.payments.filter(p => p.method === 'CASH').reduce((a, b) => a + b.amount, 0);
      const cardPayments = params.payments.filter(p => p.method === 'CREDIT_CARD').reduce((a, b) => a + b.amount, 0);
      const otherPayments = params.payments.filter(p => p.method !== 'CASH' && p.method !== 'CREDIT_CARD').reduce((a, b) => a + b.amount, 0);

      db.collection('cashSessions').updateOne(
        (s: CashSession) => s.id === params.cashSessionId,
        (prev: CashSession) => ({
          ...prev,
          totalSalesCash: Number(((prev.totalSalesCash || 0) + (cashPayments - Math.max(0, changeGiven))).toFixed(2)),
          totalSalesCard: Number(((prev.totalSalesCard || 0) + cardPayments).toFixed(2)),
          totalSalesOther: Number(((prev.totalSalesOther || 0) + otherPayments).toFixed(2)),
          transactionCount: (prev.transactionCount || 0) + 1
        })
      );

      AuditService.log(
        params.cashier,
        'POS_SALE_COMPLETED',
        'POS',
        sale.id,
        null,
        { saleNumber: sale.saleNumber, grandTotal: sale.grandTotal, itemsCount: params.items.length },
        params.branchId
      );

      return sale;
    });
  }

  /**
   * Hold / Suspend current bill
   */
  public static holdBill(saleDraft: Partial<Sale>, cashier: User): Sale {
    const suspended: Sale = {
      id: 'susp_' + Date.now(),
      saleNumber: `HOLD-${Date.now().toString().slice(-4)}`,
      companyId: saleDraft.companyId!,
      branchId: saleDraft.branchId!,
      warehouseId: saleDraft.warehouseId!,
      terminalId: saleDraft.terminalId!,
      cashSessionId: saleDraft.cashSessionId!,
      cashierId: cashier.id,
      cashierName: cashier.fullName,
      customerId: saleDraft.customerId,
      customerName: saleDraft.customerName,
      items: saleDraft.items || [],
      subtotal: saleDraft.subtotal || 0,
      discountTotal: saleDraft.discountTotal || 0,
      taxTotal: saleDraft.taxTotal || 0,
      grandTotal: saleDraft.grandTotal || 0,
      payments: [],
      amountTendered: 0,
      changeGiven: 0,
      status: 'SUSPENDED',
      pointsEarned: 0,
      pointsRedeemed: 0,
      createdAt: new Date().toISOString()
    };

    db.collection('suspendedSales').insertOne(suspended);
    AuditService.log(cashier, 'POS_BILL_SUSPENDED', 'POS', suspended.id, null, { holdNumber: suspended.saleNumber }, saleDraft.branchId);
    return suspended;
  }

  /**
   * Recall a suspended bill
   */
  public static recallBill(heldSaleId: string): Sale | undefined {
    const found = db.collection('suspendedSales').findById(heldSaleId);
    if (found) {
      db.collection('suspendedSales').deleteOne((s: Sale) => s.id === heldSaleId);
    }
    return found;
  }

  /**
   * Close Cash Session (Blind drop reconciliation and Z-Report calculation)
   */
  public static closeShift(
    sessionId: string,
    declaredCashActual: number,
    notes: string,
    user: User
  ): CashSession {
    const session = db.collection('cashSessions').findById(sessionId);
    if (!session) throw new Error('Cash session not found');

    const expectedCash = Number((session.openingCash + session.totalSalesCash).toFixed(2));
    const variance = Number((declaredCashActual - expectedCash).toFixed(2));

    const updated: Partial<CashSession> = {
      closingCashExpected: expectedCash,
      closingCashActual: declaredCashActual,
      variance,
      notes,
      status: 'CLOSED',
      closedAt: new Date().toISOString()
    };

    db.collection('cashSessions').updateOne((s: CashSession) => s.id === sessionId, updated);

    AuditService.log(
      user,
      'POS_SHIFT_CLOSED',
      'POS',
      sessionId,
      { status: 'OPEN' },
      { declaredCashActual, expectedCash, variance },
      session.branchId
    );

    return { ...session, ...updated };
  }
}
