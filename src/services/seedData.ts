import { DatabaseState } from './db/store';

export const INITIAL_SEED_DATA: DatabaseState = {
  companies: [
    {
      id: 'comp_01',
      name: 'Aura Supermarket Retail PLC',
      code: 'AURA',
      taxNumber: 'VAT-8910442-000',
      currency: 'LKR',
      currencySymbol: 'Rs. ',
      phone: '+94 11 234 5678',
      email: 'hq@auraretail.com',
      address: 'No. 120, Galle Road, Colombo 03, Sri Lanka'
    }
  ],
  branches: [
    {
      id: 'br_colombo',
      companyId: 'comp_01',
      name: 'Colombo Flagship Supermarket',
      code: 'BR-CMB-01',
      type: 'HYPERMARKET',
      address: '250 Union Place, Colombo 02',
      phone: '+94 11 789 0001',
      isActive: true
    },
    {
      id: 'br_kandy',
      companyId: 'comp_01',
      name: 'Kandy City Centre Supermarket',
      code: 'BR-KDY-02',
      type: 'RETAIL_SUPERMARKET',
      address: '5 Dalada Veediya, Kandy',
      phone: '+94 81 223 4455',
      isActive: true
    },
    {
      id: 'br_warehouse',
      companyId: 'comp_01',
      name: 'Western Central Distribution Hub',
      code: 'WH-CENTRAL-01',
      type: 'CENTRAL_DISTRIBUTION',
      address: 'Biyagama Free Trade Zone, Peliyagoda',
      phone: '+94 11 445 6677',
      isActive: true
    }
  ],
  warehouses: [
    {
      id: 'wh_cmb_floor',
      branchId: 'br_colombo',
      name: 'Colombo Retail Store Front',
      code: 'STORE-CMB-01',
      isStoreFront: true
    },
    {
      id: 'wh_cmb_back',
      branchId: 'br_colombo',
      name: 'Colombo Cold Room & Storage',
      code: 'COLD-CMB-01',
      isStoreFront: false
    },
    {
      id: 'wh_kdy_floor',
      branchId: 'br_kandy',
      name: 'Kandy Retail Store Floor',
      code: 'STORE-KDY-01',
      isStoreFront: true
    },
    {
      id: 'wh_central_hub',
      branchId: 'br_warehouse',
      name: 'Central Warehouse Rack A-Z',
      code: 'RACK-HUB-01',
      isStoreFront: false
    }
  ],
  terminals: [
    {
      id: 'term_01',
      branchId: 'br_colombo',
      terminalCode: 'POS-CMB-01',
      status: 'ONLINE',
      ipAddress: '192.168.1.101'
    },
    {
      id: 'term_02',
      branchId: 'br_colombo',
      terminalCode: 'POS-CMB-02',
      status: 'ONLINE',
      ipAddress: '192.168.1.102'
    },
    {
      id: 'term_03',
      branchId: 'br_kandy',
      terminalCode: 'POS-KDY-01',
      status: 'ONLINE',
      ipAddress: '192.168.2.101'
    }
  ],
  users: [
    {
      id: 'usr_admin',
      companyId: 'comp_01',
      branchIds: ['br_colombo', 'br_kandy', 'br_warehouse'],
      defaultBranchId: 'br_colombo',
      username: 'admin',
      fullName: 'Sunil Wickramasinghe (Super Admin)',
      email: 'admin@auraretail.com',
      phone: '+94 77 123 4567',
      role: 'SUPER_ADMIN',
      supervisorPin: '9999',
      isActive: true,
      permissions: [
        'catalog.view', 'catalog.create', 'catalog.update', 'catalog.delete',
        'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.approve',
        'purchasing.view', 'purchasing.create', 'purchasing.approve', 'purchasing.receive',
        'sales.view', 'sales.create', 'sales.return', 'sales.cancel',
        'pos.access', 'pos.override_price', 'pos.void_item', 'pos.void_bill', 'pos.refund', 'pos.open_drawer',
        'promotions.manage', 'loyalty.manage', 'customers.manage', 'suppliers.manage',
        'reports.view', 'reports.export', 'finance.view', 'finance.manage',
        'admin.users', 'admin.roles', 'admin.branches', 'admin.terminals', 'admin.audit_logs'
      ]
    },
    {
      id: 'usr_mgr_colombo',
      companyId: 'comp_01',
      branchIds: ['br_colombo'],
      defaultBranchId: 'br_colombo',
      username: 'manager_cmb',
      fullName: 'Nimali Jayawardena (Store Manager)',
      email: 'nimali@auraretail.com',
      phone: '+94 77 234 5678',
      role: 'STORE_MANAGER',
      supervisorPin: '1234',
      isActive: true,
      permissions: [
        'catalog.view', 'inventory.view', 'inventory.adjust', 'inventory.transfer',
        'purchasing.view', 'purchasing.receive', 'sales.view', 'sales.create', 'sales.return',
        'pos.access', 'pos.override_price', 'pos.void_item', 'pos.void_bill', 'pos.refund', 'pos.open_drawer',
        'customers.manage', 'reports.view', 'reports.export'
      ]
    },
    {
      id: 'usr_cashier_01',
      companyId: 'comp_01',
      branchIds: ['br_colombo'],
      defaultBranchId: 'br_colombo',
      username: 'cashier1',
      fullName: 'Kasun Perera (Cashier)',
      email: 'kasun@auraretail.com',
      phone: '+94 71 345 6789',
      role: 'CASHIER',
      isActive: true,
      permissions: ['pos.access', 'sales.create', 'sales.view']
    },
    {
      id: 'usr_purchase_officer',
      companyId: 'comp_01',
      branchIds: ['br_colombo', 'br_warehouse'],
      defaultBranchId: 'br_warehouse',
      username: 'buyer_dan',
      fullName: 'Dinesh Fernando (Purchasing Head)',
      email: 'dinesh@auraretail.com',
      phone: '+94 77 456 7890',
      role: 'PURCHASE_OFFICER',
      isActive: true,
      permissions: ['purchasing.view', 'purchasing.create', 'purchasing.approve', 'suppliers.manage', 'inventory.view']
    }
  ],
  categories: [
    { id: 'cat_fresh', name: 'Fresh Produce & Fruits', code: 'DEP-FRESH', level: 1, isActive: true },
    { id: 'cat_dairy', name: 'Dairy & Chilled Foods', code: 'DEP-DAIRY', level: 1, isActive: true },
    { id: 'cat_bakery', name: 'Bakery & Deli', code: 'DEP-BAKERY', level: 1, isActive: true },
    { id: 'cat_beverage', name: 'Beverages & Soft Drinks', code: 'DEP-BEV', level: 1, isActive: true },
    { id: 'cat_grocery', name: 'Pantry, Grains & Spices', code: 'DEP-PANTRY', level: 1, isActive: true },
    { id: 'cat_household', name: 'Household & Personal Care', code: 'DEP-HOUSE', level: 1, isActive: true },
    { id: 'cat_meat', name: 'Meat & Seafood Counter', code: 'DEP-MEAT', level: 1, isActive: true }
  ],
  products: [
    {
      id: 'prod_milk_1l',
      companyId: 'comp_01',
      sku: 'SKU-DAIRY-001',
      barcode: '4792011001011',
      additionalBarcodes: ['4792011001012'],
      name: 'Highland Fresh Full Cream Milk 1L',
      description: 'Pasteurised homogenized fresh cow milk',
      departmentId: 'cat_dairy',
      categoryId: 'cat_dairy',
      brand: 'Highland',
      unit: 'BOTTLE',
      isWeighable: false,
      costPrice: 420.00,
      sellingPrice: 480.00,
      wholesalePrice: 450.00,
      minSellingPrice: 460.00,
      taxRate: 0.00,
      reorderLevel: 25,
      maxStock: 200,
      trackBatches: true,
      isActive: true
    },
    {
      id: 'prod_bread_white',
      companyId: 'comp_01',
      sku: 'SKU-BAKERY-002',
      barcode: '4792011002022',
      additionalBarcodes: [],
      name: 'Sandwich Sliced White Bread 450g',
      description: 'Oven fresh sliced bread loaf',
      departmentId: 'cat_bakery',
      categoryId: 'cat_bakery',
      brand: 'Aura Bakery',
      unit: 'PACK',
      isWeighable: false,
      costPrice: 150.00,
      sellingPrice: 190.00,
      minSellingPrice: 180.00,
      taxRate: 0.00,
      reorderLevel: 15,
      maxStock: 100,
      trackBatches: false,
      isActive: true
    },
    {
      id: 'prod_apple_fuji',
      companyId: 'comp_01',
      sku: 'SKU-FRUIT-003',
      barcode: '200001000001',
      additionalBarcodes: [],
      name: 'Imported Fresh Fuji Apples (Weighed)',
      description: 'Crisp sweet red apples priced per KG',
      departmentId: 'cat_fresh',
      categoryId: 'cat_fresh',
      brand: 'Fresh Orchard',
      unit: 'KG',
      isWeighable: true,
      costPrice: 1200.00,
      sellingPrice: 1650.00,
      minSellingPrice: 1500.00,
      taxRate: 0.00,
      reorderLevel: 10,
      maxStock: 80,
      trackBatches: false,
      isActive: true
    },
    {
      id: 'prod_tea_earlgrey',
      companyId: 'comp_01',
      sku: 'SKU-BEV-004',
      barcode: '4791002004044',
      additionalBarcodes: [],
      name: 'Dilmah Ceylon Earl Grey Tea 50 Bags',
      description: 'Single origin pure Ceylon black tea with bergamot',
      departmentId: 'cat_beverage',
      categoryId: 'cat_beverage',
      brand: 'Dilmah',
      unit: 'PACK',
      isWeighable: false,
      costPrice: 780.00,
      sellingPrice: 950.00,
      minSellingPrice: 900.00,
      taxRate: 0.025,
      reorderLevel: 20,
      maxStock: 150,
      trackBatches: true,
      isActive: true
    },
    {
      id: 'prod_rice_samba',
      companyId: 'comp_01',
      sku: 'SKU-GRAIN-005',
      barcode: '4792011005055',
      additionalBarcodes: [],
      name: 'Nipuna Premium Keeri Samba Rice 5kg',
      description: 'Polished white fragrant aromatic rice bag',
      departmentId: 'cat_grocery',
      categoryId: 'cat_grocery',
      brand: 'Nipuna',
      unit: 'PACK',
      isWeighable: false,
      costPrice: 1450.00,
      sellingPrice: 1680.00,
      minSellingPrice: 1600.00,
      taxRate: 0.00,
      reorderLevel: 30,
      maxStock: 250,
      trackBatches: true,
      isActive: true
    },
    {
      id: 'prod_butter_salted',
      companyId: 'comp_01',
      sku: 'SKU-DAIRY-006',
      barcode: '4792011006066',
      additionalBarcodes: [],
      name: 'Anchor Pure New Zealand Butter 200g',
      description: 'Chilled salted creamery butter block',
      departmentId: 'cat_dairy',
      categoryId: 'cat_dairy',
      brand: 'Anchor',
      unit: 'PACK',
      isWeighable: false,
      costPrice: 820.00,
      sellingPrice: 990.00,
      minSellingPrice: 950.00,
      taxRate: 0.00,
      reorderLevel: 20,
      maxStock: 120,
      trackBatches: true,
      isActive: true
    },
    {
      id: 'prod_coke_1500',
      companyId: 'comp_01',
      sku: 'SKU-BEV-007',
      barcode: '4792011007077',
      additionalBarcodes: [],
      name: 'Coca Cola Pet Bottle 1.5L',
      description: 'Sparkling refreshing carbonated beverage',
      departmentId: 'cat_beverage',
      categoryId: 'cat_beverage',
      brand: 'Coca Cola',
      unit: 'BOTTLE',
      isWeighable: false,
      costPrice: 380.00,
      sellingPrice: 450.00,
      minSellingPrice: 420.00,
      taxRate: 0.025,
      reorderLevel: 40,
      maxStock: 300,
      trackBatches: true,
      isActive: true
    },
    {
      id: 'prod_dishwash_liquid',
      companyId: 'comp_01',
      sku: 'SKU-HOUSE-008',
      barcode: '4792011008088',
      additionalBarcodes: [],
      name: 'Sunlight Lemon Lime Dishwash Liquid 500ml',
      description: 'Fast grease removing anti-bacterial liquid',
      departmentId: 'cat_household',
      categoryId: 'cat_household',
      brand: 'Sunlight',
      unit: 'BOTTLE',
      isWeighable: false,
      costPrice: 280.00,
      sellingPrice: 350.00,
      minSellingPrice: 320.00,
      taxRate: 0.05,
      reorderLevel: 15,
      maxStock: 100,
      trackBatches: false,
      isActive: true
    }
  ],
  inventory: [
    {
      id: 'inv_cmb_milk',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_milk_1l',
      onHandQty: 64,
      reservedQty: 0,
      availableQty: 64,
      batches: [
        {
          batchNumber: 'B-202610-M01',
          expiryDate: '2026-10-25',
          receivedDate: '2026-10-01',
          quantity: 64,
          costPrice: 420.00
        }
      ],
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv_cmb_bread',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_bread_white',
      onHandQty: 35,
      reservedQty: 0,
      availableQty: 35,
      batches: [],
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv_cmb_apples',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_apple_fuji',
      onHandQty: 48.5,
      reservedQty: 0,
      availableQty: 48.5,
      batches: [],
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv_cmb_tea',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_tea_earlgrey',
      onHandQty: 80,
      reservedQty: 0,
      availableQty: 80,
      batches: [
        {
          batchNumber: 'B-DIL-981',
          expiryDate: '2028-06-30',
          receivedDate: '2026-09-15',
          quantity: 80,
          costPrice: 780.00
        }
      ],
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv_cmb_rice',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_rice_samba',
      onHandQty: 52,
      reservedQty: 0,
      availableQty: 52,
      batches: [
        {
          batchNumber: 'B-RICE-2026A',
          expiryDate: '2027-12-31',
          receivedDate: '2026-09-20',
          quantity: 52,
          costPrice: 1450.00
        }
      ],
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv_cmb_butter',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_butter_salted',
      onHandQty: 18, // Below reorder level 20 -> Trigger low stock warning!
      reservedQty: 0,
      availableQty: 18,
      batches: [
        {
          batchNumber: 'B-ANCHOR-008',
          expiryDate: '2026-11-15',
          receivedDate: '2026-09-10',
          quantity: 18,
          costPrice: 820.00
        }
      ],
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv_cmb_coke',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_coke_1500',
      onHandQty: 120,
      reservedQty: 0,
      availableQty: 120,
      batches: [
        {
          batchNumber: 'B-CC-9901',
          expiryDate: '2027-04-30',
          receivedDate: '2026-09-28',
          quantity: 120,
          costPrice: 380.00
        }
      ],
      updatedAt: new Date().toISOString()
    },
    {
      id: 'inv_cmb_dishwash',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_dishwash_liquid',
      onHandQty: 40,
      reservedQty: 0,
      availableQty: 40,
      batches: [],
      updatedAt: new Date().toISOString()
    }
  ],
  inventoryTransactions: [
    {
      id: 'tx_init_01',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      productId: 'prod_milk_1l',
      batchNumber: 'B-202610-M01',
      transactionType: 'OPENING_BALANCE',
      referenceType: 'MANUAL',
      referenceId: 'SYS_INIT_OCT2026',
      quantityChange: 64,
      resultingOnHandQty: 64,
      unitCost: 420.00,
      performedByUserId: 'usr_admin',
      notes: 'Initial fiscal quarter opening stock count verified',
      timestamp: '2026-10-01T08:00:00.000Z'
    }
  ],
  suppliers: [
    {
      id: 'sup_milco',
      companyId: 'comp_01',
      code: 'VEND-MILCO',
      name: 'Milco Private Limited (Highland Dairy)',
      contactPerson: 'Aruna Jayasinghe',
      email: 'sales@milco.lk',
      phone: '+94 11 258 1111',
      taxNumber: 'V-1029384-7',
      paymentTermsDays: 30,
      creditLimit: 5000000,
      currentBalance: 840000,
      address: '580 Narahenpita, Colombo 05',
      isActive: true
    },
    {
      id: 'sup_dilmah',
      companyId: 'comp_01',
      code: 'VEND-DILMAH',
      name: 'MJF Holdings (Dilmah Ceylon Tea)',
      contactPerson: 'Saman Gunaratne',
      email: 'orders@dilmahtea.com',
      phone: '+94 11 482 2000',
      taxNumber: 'V-9988776-1',
      paymentTermsDays: 45,
      creditLimit: 8000000,
      currentBalance: 1250000,
      address: '111 Maligawatte Road, Colombo 10',
      isActive: true
    },
    {
      id: 'sup_fonterra',
      companyId: 'comp_01',
      code: 'VEND-FONTERRA',
      name: 'Fonterra Brands Lanka (Anchor)',
      contactPerson: 'Priyanka Senanayake',
      email: 'b2b.lanka@fonterra.com',
      phone: '+94 11 483 3333',
      taxNumber: 'V-5544332-9',
      paymentTermsDays: 30,
      creditLimit: 10000000,
      currentBalance: 2450000,
      address: 'Biyagama Free Trade Zone',
      isActive: true
    }
  ],
  purchaseOrders: [
    {
      id: 'po_001',
      poNumber: 'PO-2026-000108',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      warehouseId: 'wh_cmb_floor',
      supplierId: 'sup_milco',
      status: 'APPROVED',
      items: [
        {
          productId: 'prod_milk_1l',
          sku: 'SKU-DAIRY-001',
          productName: 'Highland Fresh Full Cream Milk 1L',
          unit: 'BOTTLE',
          orderedQty: 100,
          receivedQty: 0,
          unitCost: 420.00,
          taxRate: 0.00,
          totalCost: 42000.00
        }
      ],
      subtotal: 42000.00,
      taxTotal: 0.00,
      grandTotal: 42000.00,
      requestedByUserId: 'usr_purchase_officer',
      approvedByUserId: 'usr_mgr_colombo',
      expectedDeliveryDate: '2026-10-08',
      createdAt: '2026-10-04T10:00:00.000Z'
    }
  ],
  goodsReceivedNotes: [],
  customers: [
    {
      id: 'cust_01',
      companyId: 'comp_01',
      customerCode: 'CUST-0098',
      fullName: 'Kamal Gunawardena',
      phone: '0777123987',
      email: 'kamal.g@gmail.com',
      customerType: 'INDIVIDUAL',
      creditLimit: 0,
      currentBalance: 0,
      loyaltyCardNumber: 'LOYAL-88992',
      loyaltyPoints: 340,
      loyaltyTier: 'GOLD',
      totalSpent: 48500.00,
      createdAt: '2025-11-12T00:00:00.000Z'
    },
    {
      id: 'cust_02',
      companyId: 'comp_01',
      customerCode: 'CUST-0145',
      fullName: 'Chamari Atapattu',
      phone: '0714556677',
      customerType: 'INDIVIDUAL',
      creditLimit: 0,
      currentBalance: 0,
      loyaltyCardNumber: 'LOYAL-10293',
      loyaltyPoints: 120,
      loyaltyTier: 'SILVER',
      totalSpent: 16800.00,
      createdAt: '2026-02-14T00:00:00.000Z'
    }
  ],
  promotions: [
    {
      id: 'promo_coke_bundle',
      code: 'PROMO-COKE-B2G1',
      name: 'Weekend Beverage Deal - Buy 2 Coke Get 1 Free',
      description: 'Buy 2 Coca Cola 1.5L bottles and receive 1 bottle free',
      type: 'BUY_X_GET_Y',
      targetType: 'SPECIFIC_PRODUCT',
      targetId: 'prod_coke_1500',
      discountValue: 0,
      buyQuantity: 2,
      getQuantity: 1,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
      priority: 1
    },
    {
      id: 'promo_basket_10',
      code: 'PROMO-BASKET-5K',
      name: 'Super Saver - 5% Off Over Rs. 5,000',
      description: 'Automatic 5% bill discount when cart total exceeds Rs. 5,000',
      type: 'PERCENTAGE_DISCOUNT',
      targetType: 'MIN_BASKET_TOTAL',
      discountValue: 5,
      minBasketValue: 5000,
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      isActive: true,
      priority: 2
    }
  ],
  sales: [],
  suspendedSales: [],
  cashSessions: [
    {
      id: 'session_cmb_01',
      sessionId: 'SHIFT-20261005-001',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      terminalId: 'term_01',
      cashierId: 'usr_cashier_01',
      cashierName: 'Kasun Perera',
      openingCash: 15000.00, // Rs. 15,000 float
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesOther: 0,
      transactionCount: 0,
      status: 'OPEN',
      notes: 'Morning shift opening float verified by supervisor',
      openedAt: new Date().toISOString()
    }
  ],
  approvals: [
    {
      id: 'appr_01',
      requestType: 'PURCHASE_ORDER',
      referenceId: 'po_001',
      description: 'PO-2026-000108 for Milco (Highland Milk) Rs. 42,000',
      requestedByUserId: 'usr_purchase_officer',
      requestedByUserName: 'Dinesh Fernando',
      branchId: 'br_colombo',
      thresholdAmount: 42000.00,
      status: 'APPROVED',
      approvedByUserId: 'usr_mgr_colombo',
      approvedByUserName: 'Nimali Jayawardena',
      createdAt: '2026-10-04T10:05:00.000Z',
      resolvedAt: '2026-10-04T11:20:00.000Z'
    }
  ],
  auditLogs: [
    {
      id: 'audit_001',
      timestamp: '2026-10-05T02:00:00.000Z',
      companyId: 'comp_01',
      branchId: 'br_colombo',
      userId: 'usr_admin',
      userName: 'Sunil Wickramasinghe',
      role: 'SUPER_ADMIN',
      action: 'SYSTEM_BOOTSTRAP',
      module: 'ORGANIZATION',
      recordId: 'comp_01',
      ipAddress: '127.0.0.1',
      afterState: { status: 'INITIALIZED_SUCCESSFULLY' }
    }
  ]
};

export function initializeDatabaseIfEmpty() {
  const stored = localStorage.getItem('aura_retail_erp_v1_db');
  if (!stored) {
    localStorage.setItem('aura_retail_erp_v1_db', JSON.stringify(INITIAL_SEED_DATA));
  }
}
