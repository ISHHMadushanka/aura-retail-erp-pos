import { db } from './db/store';
import { Sale, InventoryRecord, Product, CashSession } from '../types/erp';

export interface DashboardMetrics {
  totalSalesRevenue: number;
  totalGrossProfit: number;
  totalTransactions: number;
  averageBasketValue: number;
  lowStockItemsCount: number;
  topSellingProducts: Array<{ name: string; sku: string; unitsSold: number; revenue: number }>;
  salesByBranch: Array<{ branchId: string; branchName: string; totalRevenue: number; count: number }>;
  hourlySales: Array<{ hour: string; revenue: number; count: number }>;
}

export class ReportingService {
  public static getMetrics(branchId?: string): DashboardMetrics {
    const allSales = db.collection('sales').find(
      (s: Sale) => s.status === 'COMPLETED' && (!branchId || s.branchId === branchId)
    );
    const products = db.collection('products').find();
    const inventory = db.collection('inventory').find(
      (inv: InventoryRecord) => !branchId || inv.branchId === branchId
    );
    const branches = db.collection('branches').find();

    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;

    const productSalesMap: Record<string, { units: number; revenue: number }> = {};
    const branchSalesMap: Record<string, { revenue: number; count: number }> = {};
    const hourlySalesMap: Record<string, { revenue: number; count: number }> = {};

    // Initialize 24-hour distribution
    for (let h = 8; h <= 22; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      hourlySalesMap[label] = { revenue: 0, count: 0 };
    }

    allSales.forEach((sale: Sale) => {
      totalSalesRevenue += sale.grandTotal;

      // Hourly grouping
      const date = new Date(sale.createdAt);
      const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
      if (hourlySalesMap[hourKey]) {
        hourlySalesMap[hourKey].revenue += sale.grandTotal;
        hourlySalesMap[hourKey].count += 1;
      }

      // Branch grouping
      if (!branchSalesMap[sale.branchId]) {
        branchSalesMap[sale.branchId] = { revenue: 0, count: 0 };
      }
      branchSalesMap[sale.branchId].revenue += sale.grandTotal;
      branchSalesMap[sale.branchId].count += 1;

      // Product sales
      sale.items.forEach(item => {
        const prod = products.find((p: Product) => p.id === item.productId);
        const cost = prod ? prod.costPrice * item.quantity : item.unitPrice * 0.7 * item.quantity;
        totalCostOfGoodsSold += cost;

        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { units: 0, revenue: 0 };
        }
        productSalesMap[item.productId].units += item.quantity;
        productSalesMap[item.productId].revenue += item.netTotal;
      });
    });

    const totalTransactions = allSales.length;
    const averageBasketValue = totalTransactions > 0 ? Number((totalSalesRevenue / totalTransactions).toFixed(2)) : 0;
    const totalGrossProfit = Number((totalSalesRevenue - totalCostOfGoodsSold).toFixed(2));

    // Low stock count
    let lowStockCount = 0;
    inventory.forEach((inv: InventoryRecord) => {
      const prod = products.find((p: Product) => p.id === inv.productId);
      if (prod && inv.availableQty <= prod.reorderLevel) {
        lowStockCount++;
      }
    });

    // Top selling
    const topSellingProducts = Object.entries(productSalesMap)
      .map(([prodId, data]) => {
        const p = products.find((pr: Product) => pr.id === prodId);
        return {
          name: p ? p.name : 'Unknown SKU',
          sku: p ? p.sku : 'SKU',
          unitsSold: Number(data.units.toFixed(2)),
          revenue: Number(data.revenue.toFixed(2))
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Sales by branch
    const salesByBranch = Object.entries(branchSalesMap).map(([brId, data]) => {
      const b = branches.find((br: any) => br.id === brId);
      return {
        branchId: brId,
        branchName: b ? b.name : brId,
        totalRevenue: Number(data.revenue.toFixed(2)),
        count: data.count
      };
    });

    // Hourly list
    const hourlySales = Object.entries(hourlySalesMap).map(([hour, data]) => ({
      hour,
      revenue: Number(data.revenue.toFixed(2)),
      count: data.count
    }));

    return {
      totalSalesRevenue: Number(totalSalesRevenue.toFixed(2)),
      totalGrossProfit,
      totalTransactions,
      averageBasketValue,
      lowStockItemsCount: lowStockCount,
      topSellingProducts,
      salesByBranch,
      hourlySales
    };
  }

  public static getCashierPerformance(): Array<CashSession & { branchName: string }> {
    const sessions = db.collection('cashSessions').find();
    const branches = db.collection('branches').find();

    return sessions.map((s: CashSession) => {
      const br = branches.find((b: any) => b.id === s.branchId);
      return {
        ...s,
        branchName: br ? br.name : s.branchId
      };
    }).sort((a: any, b: any) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }
}
