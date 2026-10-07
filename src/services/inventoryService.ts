import { db } from './db/store';
import { InventoryRecord, InventoryTransaction, InventoryTransactionType, Product, User } from '../types/erp';
import { AuditService } from './auditService';

export class InventoryService {
  /**
   * Get stock record for a product at a specific branch/warehouse
   */
  public static getStock(productId: string, branchId: string, warehouseId?: string): InventoryRecord | undefined {
    return db.collection('inventory').findOne(
      (inv: InventoryRecord) => inv.productId === productId && inv.branchId === branchId && (!warehouseId || inv.warehouseId === warehouseId)
    );
  }

  /**
   * Get all stock across a branch with joined product information
   */
  public static getBranchInventory(branchId: string): Array<InventoryRecord & { product: Product }> {
    const products = db.collection('products').find();
    const inventory = db.collection('inventory').find((inv: InventoryRecord) => inv.branchId === branchId);

    return inventory.map((inv: InventoryRecord) => {
      const prod = products.find((p: Product) => p.id === inv.productId) || {
        id: inv.productId,
        name: 'Unknown SKU',
        sku: 'UNKNOWN',
        barcode: '',
        sellingPrice: 0,
        costPrice: 0,
        reorderLevel: 10,
        unit: 'PCS'
      } as any;
      return {
        ...inv,
        product: prod
      };
    });
  }

  /**
   * Adjust inventory with double-entry audit transaction
   */
  public static recordMovement(
    params: {
      companyId: string;
      branchId: string;
      warehouseId: string;
      productId: string;
      quantityChange: number; // positive for inflow, negative for outflow
      transactionType: InventoryTransactionType;
      referenceType: 'GRN' | 'SALE' | 'TRANSFER' | 'ADJUSTMENT' | 'MANUAL';
      referenceId: string;
      unitCost: number;
      batchNumber?: string;
      expiryDate?: string;
      notes?: string;
      user: User;
    }
  ): { inventory: InventoryRecord; transaction: InventoryTransaction } {
    let invRecord = db.collection('inventory').findOne(
      (inv: InventoryRecord) => inv.productId === params.productId && inv.branchId === params.branchId && inv.warehouseId === params.warehouseId
    );

    const oldOnHand = invRecord ? invRecord.onHandQty : 0;
    const newOnHand = Number((oldOnHand + params.quantityChange).toFixed(3));

    if (newOnHand < 0 && params.transactionType === 'POS_SALE') {
      // Allowed in retail with negative stock flag, but let's log warning
      console.warn(`Negative inventory occurred for product ${params.productId} at branch ${params.branchId}`);
    }

    if (!invRecord) {
      invRecord = {
        id: 'inv_' + Math.random().toString(36).substr(2, 9),
        companyId: params.companyId,
        branchId: params.branchId,
        warehouseId: params.warehouseId,
        productId: params.productId,
        onHandQty: newOnHand,
        reservedQty: 0,
        availableQty: newOnHand,
        batches: params.batchNumber ? [{
          batchNumber: params.batchNumber,
          expiryDate: params.expiryDate || '',
          receivedDate: new Date().toISOString(),
          quantity: Math.max(0, params.quantityChange),
          costPrice: params.unitCost
        }] : [],
        updatedAt: new Date().toISOString()
      };
      db.collection('inventory').insertOne(invRecord);
    } else {
      // Update batch if provided
      const batches = [...(invRecord.batches || [])];
      if (params.batchNumber) {
        const batchIdx = batches.findIndex(b => b.batchNumber === params.batchNumber);
        if (batchIdx >= 0) {
          batches[batchIdx].quantity = Math.max(0, Number((batches[batchIdx].quantity + params.quantityChange).toFixed(3)));
        } else if (params.quantityChange > 0) {
          batches.push({
            batchNumber: params.batchNumber,
            expiryDate: params.expiryDate || '',
            receivedDate: new Date().toISOString(),
            quantity: params.quantityChange,
            costPrice: params.unitCost
          });
        }
      }

      db.collection('inventory').updateOne(
        (inv: InventoryRecord) => inv.id === invRecord.id,
        {
          onHandQty: newOnHand,
          availableQty: Number((newOnHand - (invRecord.reservedQty || 0)).toFixed(3)),
          batches,
          updatedAt: new Date().toISOString()
        }
      );
      invRecord.onHandQty = newOnHand;
      invRecord.availableQty = newOnHand - (invRecord.reservedQty || 0);
    }

    // Double-entry immutable transaction log
    const tx: InventoryTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9) + Date.now(),
      companyId: params.companyId,
      branchId: params.branchId,
      warehouseId: params.warehouseId,
      productId: params.productId,
      batchNumber: params.batchNumber,
      transactionType: params.transactionType,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      quantityChange: params.quantityChange,
      resultingOnHandQty: newOnHand,
      unitCost: params.unitCost,
      performedByUserId: params.user.id,
      notes: params.notes,
      timestamp: new Date().toISOString()
    };
    db.collection('inventoryTransactions').insertOne(tx);

    AuditService.log(
      params.user,
      `STOCK_MOVEMENT_${params.transactionType}`,
      'INVENTORY',
      invRecord.id,
      { onHand: oldOnHand },
      { onHand: newOnHand, quantityChange: params.quantityChange, referenceId: params.referenceId },
      params.branchId
    );

    return { inventory: invRecord, transaction: tx };
  }

  /**
   * Transfer stock between warehouses or branches
   */
  public static transferStock(
    sourceWarehouseId: string,
    sourceBranchId: string,
    destWarehouseId: string,
    destBranchId: string,
    productId: string,
    quantity: number,
    user: User,
    notes?: string
  ): void {
    const product = db.collection('products').findById(productId);
    if (!product) throw new Error('Product not found');

    const sourceStock = db.collection('inventory').findOne(
      (inv: InventoryRecord) => inv.productId === productId && inv.warehouseId === sourceWarehouseId
    );

    if (!sourceStock || sourceStock.availableQty < quantity) {
      throw new Error(`Insufficient stock available for transfer. Current available: ${sourceStock ? sourceStock.availableQty : 0}`);
    }

    const transferRef = 'TRF-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Outflow from source
    this.recordMovement({
      companyId: user.companyId,
      branchId: sourceBranchId,
      warehouseId: sourceWarehouseId,
      productId,
      quantityChange: -quantity,
      transactionType: 'TRANSFER_DISPATCH',
      referenceType: 'TRANSFER',
      referenceId: transferRef,
      unitCost: product.costPrice,
      notes: `Transfer dispatched to ${destWarehouseId}. ${notes || ''}`,
      user
    });

    // Inflow to destination
    this.recordMovement({
      companyId: user.companyId,
      branchId: destBranchId,
      warehouseId: destWarehouseId,
      productId,
      quantityChange: quantity,
      transactionType: 'TRANSFER_RECEIVE',
      referenceType: 'TRANSFER',
      referenceId: transferRef,
      unitCost: product.costPrice,
      notes: `Transfer received from ${sourceWarehouseId}. ${notes || ''}`,
      user
    });
  }

  /**
   * Manual Stock Adjustment (Stock count corrections, shrinkage, wastage)
   */
  public static adjustStock(
    branchId: string,
    warehouseId: string,
    productId: string,
    newQuantity: number,
    reason: 'CYCLE_COUNT' | 'DAMAGE_WASTAGE' | 'EXPIRY' | 'THEFT' | 'SUPPLIER_MISMATCH',
    user: User,
    notes?: string
  ): void {
    const currentStock = db.collection('inventory').findOne(
      (inv: InventoryRecord) => inv.productId === productId && inv.warehouseId === warehouseId
    );
    const product = db.collection('products').findById(productId);
    if (!product) throw new Error('Product not found');

    const currentQty = currentStock ? currentStock.onHandQty : 0;
    const diff = Number((newQuantity - currentQty).toFixed(3));

    if (diff === 0) return;

    this.recordMovement({
      companyId: user.companyId,
      branchId,
      warehouseId,
      productId,
      quantityChange: diff,
      transactionType: diff < 0 && reason === 'DAMAGE_WASTAGE' ? 'DAMAGE_WASTAGE' : 'STOCK_ADJUSTMENT',
      referenceType: 'ADJUSTMENT',
      referenceId: `ADJ-${reason}-${Date.now()}`,
      unitCost: product.costPrice,
      notes: `Reason: ${reason}. Notes: ${notes || 'Stock take adjustment'}`,
      user
    });
  }
}
