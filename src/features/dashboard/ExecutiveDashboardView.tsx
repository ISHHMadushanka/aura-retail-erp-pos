import React from 'react';
import {
  TrendingUp, DollarSign, ShoppingCart, AlertTriangle, ArrowUpRight,
  Boxes, Monitor, ShoppingBag, PlusCircle, ArrowLeftRight, Clock,
  CheckCircle2, Sparkles, Building2
} from 'lucide-react';
import { ReportingService } from '../../services/reportingService';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db/store';
import { InventoryRecord, Product, Sale, CashSession } from '../../types/erp';
import { NavTab } from '../../components/layout/Sidebar';

interface ExecutiveDashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({ onNavigate }) => {
  const { activeBranch } = useAuth();

  const metrics = ReportingService.getMetrics(activeBranch.id);
  const recentSales = db.collection('sales').find(
    (s: Sale) => s.branchId === activeBranch.id
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const inventory = db.collection('inventory').find((inv: InventoryRecord) => inv.branchId === activeBranch.id);
  const products = db.collection('products').find();

  // Find low stock items
  const lowStockItems = inventory.filter((inv: InventoryRecord) => {
    const prod = products.find((p: Product) => p.id === inv.productId);
    return prod && inv.availableQty <= prod.reorderLevel;
  }).map((inv: InventoryRecord) => {
    const prod = products.find((p: Product) => p.id === inv.productId)!;
    return {
      name: prod.name,
      sku: prod.sku,
      unit: prod.unit,
      available: inv.availableQty,
      reorder: prod.reorderLevel
    };
  });

  const activeSessions = db.collection('cashSessions').find(
    (s: CashSession) => s.branchId === activeBranch.id && s.status === 'OPEN'
  );

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>{activeBranch.name} • Live Operations</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            AuraRetail Executive Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time multi-branch retail ledger, POS checkout velocity, and double-entry inventory telemetry.
          </p>
        </div>

        {/* Quick Operational Launchers */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-950"
          >
            <Monitor className="w-4 h-4" />
            <span>Launch POS Lane</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
            <span>Transfer Stock</span>
          </button>

          <button
            onClick={() => onNavigate('purchasing')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Today's Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black font-mono text-emerald-400">
            Rs. {metrics.totalSalesRevenue.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Active transactions billed</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Gross Margin Profit</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black font-mono text-blue-400">
            Rs. {metrics.totalGrossProfit.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">Net COGS contribution</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Transactions Billed</span>
            <ShoppingCart className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-black font-mono text-white">
            {metrics.totalTransactions}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Avg basket: Rs. {metrics.averageBasketValue.toFixed(2)}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Active POS Lanes</span>
            <Monitor className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black font-mono text-amber-400">
            {activeSessions.length}
          </p>
          <p className="text-[11px] text-slate-400">Open cashier shifts</p>
        </div>
      </div>

      {/* 2-Column Section: Low Stock Warnings & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Low Stock Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Replenishment Alerts (Low Stock)</h3>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-slate-400 hover:text-white"
            >
              View Inventory →
            </button>
          </div>

          <div className="space-y-2.5">
            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                All SKUs are comfortably above reorder thresholds.
              </div>
            ) : (
              lowStockItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-rose-900/40"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200">{item.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-rose-400">
                      {item.available} {item.unit} left
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">Reorder at: {item.reorder}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Recent Sales Invoices */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Recent POS Checkout Stream</h3>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-slate-400 hover:text-white"
            >
              All Invoices →
            </button>
          </div>

          <div className="space-y-2.5">
            {recentSales.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No checkout transactions billed yet.
              </div>
            ) : (
              recentSales.map((sale: Sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">{sale.saleNumber}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{sale.terminalId}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {sale.items.length} items • Cashier: {sale.cashierName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      Rs. {sale.grandTotal.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
