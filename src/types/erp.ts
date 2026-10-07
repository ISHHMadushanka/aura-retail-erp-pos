export type UserRoleType = 
  | 'SUPER_ADMIN' 
  | 'SYSTEM_ADMIN' 
  | 'CEO' 
  | 'STORE_MANAGER' 
  | 'WAREHOUSE_MANAGER' 
  | 'PURCHASE_OFFICER' 
  | 'SALES_MANAGER' 
  | 'CASHIER' 
  | 'INVENTORY_OFFICER' 
  | 'ACCOUNTANT' 
  | 'AUDITOR';

export type PermissionCode =
  | 'catalog.view' | 'catalog.create' | 'catalog.update' | 'catalog.delete'
  | 'inventory.view' | 'inventory.adjust' | 'inventory.transfer' | 'inventory.approve'
  | 'purchasing.view' | 'purchasing.create' | 'purchasing.approve' | 'purchasing.receive'
  | 'sales.view' | 'sales.create' | 'sales.return' | 'sales.cancel'
  | 'pos.access' | 'pos.override_price' | 'pos.void_item' | 'pos.void_bill' | 'pos.refund' | 'pos.open_drawer'
  | 'promotions.manage'
  | 'loyalty.manage'
  | 'customers.manage'
  | 'suppliers.manage'
  | 'reports.view' | 'reports.export'
  | 'finance.view' | 'finance.manage'
  | 'admin.users' | 'admin.roles' | 'admin.branches' | 'admin.terminals' | 'admin.audit_logs';

export interface Company {
  id: string;
  name: string;
  code: string;
  taxNumber: string;
  currency: string;
  currencySymbol: string;
  phone: string;
  email: string;
  address: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type: 'RETAIL_SUPERMARKET' | 'HYPERMARKET' | 'EXPRESS_MART' | 'CENTRAL_DISTRIBUTION';
  address: string;
  phone: string;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  branchId: string;
  name: string;
  code: string;
  isStoreFront: boolean;
}

export interface PosTerminal {
  id: string;
  branchId: string;
  terminalCode: string;
  macAddress?: string;
  ipAddress?: string;
  status: 'ONLINE' | 'OFFLINE' | 'LOCKED';
  currentCashSessionId?: string;
}

export interface User {
  id: string;
  companyId: string;
  branchIds: string[];
  defaultBranchId: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRoleType;
  permissions: PermissionCode[];
  supervisorPin?: string; // Hashed or 4-digit PIN for overrides
  isActive: boolean;
  avatarUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  parentId?: string; // Hierarchical: Department -> Category -> Subcategory
  level: number; // 1 = Department, 2 = Category, 3 = Subcategory
  icon?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  companyId: string;
  sku: string;
  barcode: string;
  additionalBarcodes: string[];
  name: string;
  description: string;
  departmentId: string;
  categoryId: string;
  subCategoryId?: string;
  brand: string;
  unit: 'PCS' | 'KG' | 'G' | 'L' | 'ML' | 'PACK' | 'BOTTLE';
  isWeighable: boolean;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minSellingPrice: number;
  taxRate: number; // e.g. 0.08 for 8%
  reorderLevel: number;
  maxStock: number;
  trackBatches: boolean;
  isActive: boolean;
  imageUrl?: string;
}

export interface BatchStock {
  batchNumber: string;
  expiryDate: string; // ISO date
  receivedDate: string;
  quantity: number;
  costPrice: number;
}

export interface InventoryRecord {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  productId: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  batches: BatchStock[];
  lastAuditedAt?: string;
  updatedAt: string;
}

export type InventoryTransactionType =
  | 'PURCHASE_GRN'
  | 'POS_SALE'
  | 'SALE_RETURN'
  | 'TRANSFER_DISPATCH'
  | 'TRANSFER_RECEIVE'
  | 'STOCK_ADJUSTMENT'
  | 'DAMAGE_WASTAGE'
  | 'OPENING_BALANCE';

export interface InventoryTransaction {
  id: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  productId: string;
  batchNumber?: string;
  transactionType: InventoryTransactionType;
  referenceType: 'GRN' | 'SALE' | 'TRANSFER' | 'ADJUSTMENT' | 'MANUAL';
  referenceId: string;
  quantityChange: number; // + for inflow, - for outflow
  resultingOnHandQty: number;
  unitCost: number;
  performedByUserId: string;
  notes?: string;
  timestamp: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  taxNumber: string;
  paymentTermsDays: number;
  creditLimit: number;
  currentBalance: number;
  address: string;
  isActive: boolean;
}

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  taxRate: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  supplierId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  requestedByUserId: string;
  approvedByUserId?: string;
  expectedDeliveryDate: string;
  createdAt: string;
}

export interface GoodsReceivedNoteItem {
  productId: string;
  sku: string;
  productName: string;
  receivedQty: number;
  unitCost: number;
  batchNumber: string;
  expiryDate: string;
  totalCost: number;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  supplierId: string;
  supplierInvoiceNumber: string;
  items: GoodsReceivedNoteItem[];
  totalValue: number;
  receivedByUserId: string;
  receivedAt: string;
  status: 'POSTED';
}

export interface Customer {
  id: string;
  companyId: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string;
  customerType: 'INDIVIDUAL' | 'CORPORATE';
  creditLimit: number;
  currentBalance: number;
  loyaltyCardNumber?: string;
  loyaltyPoints: number;
  loyaltyTier: 'SILVER' | 'GOLD' | 'PLATINUM';
  totalSpent: number;
  createdAt: string;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'PERCENTAGE_DISCOUNT' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'BUNDLE_PRICE';
  targetType: 'ALL_PRODUCTS' | 'SPECIFIC_CATEGORY' | 'SPECIFIC_PRODUCT' | 'MIN_BASKET_TOTAL';
  targetId?: string; // categoryId or productId
  discountValue: number; // percentage or fixed amount
  buyQuantity?: number;
  getQuantity?: number;
  minBasketValue?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  priority: number;
}

export interface CartItem {
  id: string; // generated client-side line id
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  discountReason?: string;
  netTotal: number;
  isWeighable: boolean;
  batchNumber?: string;
}

export interface PaymentEntry {
  method: 'CASH' | 'CREDIT_CARD' | 'LOYALTY_POINTS' | 'GIFT_VOUCHER' | 'BANK_TRANSFER';
  amount: number;
  referenceNumber?: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  companyId: string;
  branchId: string;
  warehouseId: string;
  terminalId: string;
  cashSessionId: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  payments: PaymentEntry[];
  amountTendered: number;
  changeGiven: number;
  status: 'COMPLETED' | 'SUSPENDED' | 'VOIDED' | 'RETURNED';
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
}

export interface CashSession {
  id: string;
  sessionId: string;
  companyId: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  cashierName: string;
  openingCash: number;
  closingCashExpected?: number;
  closingCashActual?: number;
  variance?: number; // actual - expected
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesOther: number;
  transactionCount: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  openedAt: string;
  closedAt?: string;
}

export interface ApprovalRequest {
  id: string;
  requestType: 'PRICE_OVERRIDE' | 'LINE_VOID' | 'BILL_VOID' | 'REFUND' | 'PURCHASE_ORDER' | 'STOCK_ADJUSTMENT';
  referenceId?: string;
  description: string;
  requestedByUserId: string;
  requestedByUserName: string;
  branchId: string;
  thresholdAmount?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedByUserId?: string;
  approvedByUserName?: string;
  rejectionReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  companyId: string;
  branchId?: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  module: string;
  recordId: string;
  ipAddress: string;
  beforeState?: any;
  afterState?: any;
}
