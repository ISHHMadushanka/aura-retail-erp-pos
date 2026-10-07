import { db } from './db/store';
import { GoodsReceivedNote, GoodsReceivedNoteItem, PurchaseOrder, User } from '../types/erp';
import { InventoryService } from './inventoryService';
import { AuditService } from './auditService';

export class PurchasingService {
  /**
   * Create a new Purchase Order
   */
  public static createPurchaseOrder(params: {
    companyId: string;
    branchId: string;
    warehouseId: string;
    supplierId: string;
    items: Array<{
      productId: string;
      orderedQty: number;
      unitCost: number;
    }>;
    expectedDeliveryDate: string;
    user: User;
  }): PurchaseOrder {
    const products = db.collection('products').find();
    
    let subtotal = 0;
    const poItems = params.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const totalCost = Number((item.orderedQty * item.unitCost).toFixed(2));
      subtotal += totalCost;
      return {
        productId: item.productId,
        sku: prod ? prod.sku : 'SKU-GEN',
        productName: prod ? prod.name : 'Item',
        unit: prod ? prod.unit : 'PCS',
        orderedQty: item.orderedQty,
        receivedQty: 0,
        unitCost: item.unitCost,
        taxRate: prod ? prod.taxRate : 0,
        totalCost
      };
    });

    const poNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    // Check if requires approval based on threshold
    const requiresApproval = subtotal > 25000.00;
    const status = requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';

    const po: PurchaseOrder = {
      id: 'po_' + Math.random().toString(36).substr(2, 9),
      poNumber,
      companyId: params.companyId,
      branchId: params.branchId,
      warehouseId: params.warehouseId,
      supplierId: params.supplierId,
      status,
      items: poItems,
      subtotal,
      taxTotal: 0,
      grandTotal: subtotal,
      requestedByUserId: params.user.id,
      expectedDeliveryDate: params.expectedDeliveryDate,
      createdAt: new Date().toISOString()
    };

    db.collection('purchaseOrders').insertOne(po);

    if (requiresApproval) {
      db.collection('approvals').insertOne({
        id: 'appr_' + Date.now(),
        requestType: 'PURCHASE_ORDER',
        referenceId: po.id,
        description: `${po.poNumber} for Rs. ${po.grandTotal.toLocaleString()}`,
        requestedByUserId: params.user.id,
        requestedByUserName: params.user.fullName,
        branchId: params.branchId,
        thresholdAmount: po.grandTotal,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    AuditService.log(
      params.user,
      'PURCHASE_ORDER_CREATED',
      'PURCHASING',
      po.id,
      null,
      { poNumber: po.poNumber, grandTotal: po.grandTotal, status: po.status },
      params.branchId
    );

    return po;
  }

  /**
   * Receive Goods Received Note (GRN) from Supplier against an approved PO
   */
  public static async receiveGRN(params: {
    poId: string;
    supplierInvoiceNumber: string;
    receivedItems: Array<{
      productId: string;
      receivedQty: number;
      batchNumber: string;
      expiryDate: string;
    }>;
    user: User;
  }): Promise<GoodsReceivedNote> {
    const po = db.collection('purchaseOrders').findById(params.poId);
    if (!po) throw new Error('Purchase order not found');

    return await db.runInTransaction(async () => {
      const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;
      let totalValue = 0;

      const grnItems: GoodsReceivedNoteItem[] = params.receivedItems.map(item => {
        const poItem = po.items.find((i: any) => i.productId === item.productId);
        const unitCost = poItem ? poItem.unitCost : 0;
        const lineTotal = Number((item.receivedQty * unitCost).toFixed(2));
        totalValue += lineTotal;

        return {
          productId: item.productId,
          sku: poItem ? poItem.sku : '',
          productName: poItem ? poItem.productName : '',
          receivedQty: item.receivedQty,
          unitCost,
          batchNumber: item.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
          expiryDate: item.expiryDate,
          totalCost: lineTotal
        };
      });

      const grn: GoodsReceivedNote = {
        id: 'grn_' + Math.random().toString(36).substr(2, 9),
        grnNumber,
        poId: po.id,
        poNumber: po.poNumber,
        companyId: po.companyId,
        branchId: po.branchId,
        warehouseId: po.warehouseId,
        supplierId: po.supplierId,
        supplierInvoiceNumber: params.supplierInvoiceNumber,
        items: grnItems,
        totalValue,
        receivedByUserId: params.user.id,
        receivedAt: new Date().toISOString(),
        status: 'POSTED'
      };

      db.collection('goodsReceivedNotes').insertOne(grn);

      // Increase inventory via double-entry stock transactions
      for (const item of grnItems) {
        InventoryService.recordMovement({
          companyId: po.companyId,
          branchId: po.branchId,
          warehouseId: po.warehouseId,
          productId: item.productId,
          quantityChange: item.receivedQty,
          transactionType: 'PURCHASE_GRN',
          referenceType: 'GRN',
          referenceId: grn.grnNumber,
          unitCost: item.unitCost,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          notes: `GRN ${grn.grnNumber} from Invoice ${params.supplierInvoiceNumber}`,
          user: params.user
        });
      }

      // Update PO items received counts and status
      const updatedPoItems = po.items.map((pi: any) => {
        const matchedReceived = grnItems.find(gi => gi.productId === pi.productId);
        const newReceivedQty = (pi.receivedQty || 0) + (matchedReceived ? matchedReceived.receivedQty : 0);
        return {
          ...pi,
          receivedQty: newReceivedQty
        };
      });

      const allFulfilled = updatedPoItems.every((pi: any) => pi.receivedQty >= pi.orderedQty);
      const newStatus = allFulfilled ? 'COMPLETED' : 'PARTIALLY_RECEIVED';

      db.collection('purchaseOrders').updateOne(
        (p: PurchaseOrder) => p.id === po.id,
        {
          items: updatedPoItems,
          status: newStatus
        }
      );

      AuditService.log(
        params.user,
        'GOODS_RECEIVED_POSTED',
        'PURCHASING',
        grn.id,
        null,
        { grnNumber: grn.grnNumber, poNumber: po.poNumber, totalValue: grn.totalValue },
        po.branchId
      );

      return grn;
    });
  }
}
