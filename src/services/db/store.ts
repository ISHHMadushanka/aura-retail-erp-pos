import {
  Company, Branch, Warehouse, PosTerminal, User, Category, Product,
  InventoryRecord, InventoryTransaction, Supplier, PurchaseOrder,
  GoodsReceivedNote, Customer, Promotion, Sale, CashSession,
  ApprovalRequest, AuditLog
} from '../../types/erp';

export interface DatabaseState {
  companies: Company[];
  branches: Branch[];
  warehouses: Warehouse[];
  terminals: PosTerminal[];
  users: User[];
  categories: Category[];
  products: Product[];
  inventory: InventoryRecord[];
  inventoryTransactions: InventoryTransaction[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceivedNotes: GoodsReceivedNote[];
  customers: Customer[];
  promotions: Promotion[];
  sales: Sale[];
  suspendedSales: Sale[];
  cashSessions: CashSession[];
  approvals: ApprovalRequest[];
  auditLogs: AuditLog[];
}

const STORAGE_KEY = 'aura_retail_erp_v1_db';

class EnterpriseDatabase {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();
  private isTransactionActive = false;
  private transactionSnapshot: string | null = null;

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): DatabaseState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load DB state from localStorage, initializing fresh', e);
    }
    return this.createEmptyState();
  }

  private createEmptyState(): DatabaseState {
    return {
      companies: [],
      branches: [],
      warehouses: [],
      terminals: [],
      users: [],
      categories: [],
      products: [],
      inventory: [],
      inventoryTransactions: [],
      suppliers: [],
      purchaseOrders: [],
      goodsReceivedNotes: [],
      customers: [],
      promotions: [],
      sales: [],
      suspendedSales: [],
      cashSessions: [],
      approvals: [],
      auditLogs: []
    };
  }

  public save(): void {
    if (this.isTransactionActive) return; // Wait until transaction commits
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Storage quota exceeded or error saving DB', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  public resetToSeed(seed: DatabaseState): void {
    this.state = JSON.parse(JSON.stringify(seed));
    this.save();
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.isTransactionActive) {
      return await work(); // Nested transaction re-uses active boundary
    }

    this.isTransactionActive = true;
    this.transactionSnapshot = JSON.stringify(this.state);

    try {
      const result = await work();
      this.isTransactionActive = false;
      this.transactionSnapshot = null;
      this.save();
      return result;
    } catch (error) {
      if (this.transactionSnapshot) {
        this.state = JSON.parse(this.transactionSnapshot);
      }
      this.isTransactionActive = false;
      this.transactionSnapshot = null;
      throw error;
    }
  }

  // Generic collection operations mimicking MongoDB
  public collection<K extends keyof DatabaseState>(name: K) {
    const table = this.state[name] as any[];

    return {
      find: (filter: (item: any) => boolean = () => true): any[] => {
        return table.filter(filter);
      },
      findOne: (filter: (item: any) => boolean): any | undefined => {
        return table.find(filter);
      },
      findById: (id: string): any | undefined => {
        return table.find((item: any) => item.id === id);
      },
      insertOne: (doc: any): any => {
        const newDoc = { ...doc };
        if (!newDoc.id) {
          newDoc.id = 'doc_' + Math.random().toString(36).substr(2, 9) + Date.now();
        }
        table.push(newDoc);
        this.save();
        return newDoc;
      },
      insertMany: (docs: any[]): any[] => {
        const created = docs.map(doc => ({
          ...doc,
          id: doc.id || 'doc_' + Math.random().toString(36).substr(2, 9) + Date.now()
        }));
        table.push(...created);
        this.save();
        return created;
      },
      updateOne: (filter: (item: any) => boolean, update: Partial<any> | ((prev: any) => any)): boolean => {
        const index = table.findIndex(filter);
        if (index === -1) return false;
        
        if (typeof update === 'function') {
          table[index] = update(table[index]);
        } else {
          table[index] = { ...table[index], ...update };
        }
        this.save();
        return true;
      },
      deleteOne: (filter: (item: any) => boolean): boolean => {
        const index = table.findIndex(filter);
        if (index === -1) return false;
        table.splice(index, 1);
        this.save();
        return true;
      },
      count: (filter: (item: any) => boolean = () => true): number => {
        return table.filter(filter).length;
      }
    };
  }
}

export const db = new EnterpriseDatabase();
