import React, { useState } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart, AlertTriangle,
  Download, Clock, Building2, User, FileSpreadsheet
} from 'lucide-react';
import { ReportingService } from '../../services/reportingService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const ReportsView: React.FC = () => {
  const { activeBranch } = useAuth();
  const { success } = useNotification();
  const [filterScope, setFilterScope] = useState<'BRANCH' | 'ALL'>('BRANCH');

  const metrics = ReportingService.getMetrics(filterScope === 'BRANCH' ? activeBranch.id : undefined);
  const cashierSessions = ReportingService.getCashierPerformance();

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Metric,Value\r\n';
    csvContent += `Total Revenue,${metrics.totalSalesRevenue}\r\n`;
    csvContent += `Gross Profit,${metrics.totalGrossProfit}\r\n`;
    csvContent += `Total Orders,${metrics.totalTransactions}\r\n`;
    csvContent += `Average Basket Value,${metrics.averageBasketValue}\r\n`;
    csvContent += `Low Stock SKUs,${metrics.lowStockItemsCount}\r\n\r\n`;

    csvContent += 'Top SKU,Units Sold,Revenue\r\n';
    metrics.topSellingProducts.forEach(p => {
      csvContent += `"${p.name}",${p.unitsSold},${p.revenue}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AuraRetail_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Export Completed', 'Analytics summary exported as CSV.');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Executive BI & Store Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Real-time sales velocity, gross profit margins, basket economics, and cashier drawer audits
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Scope Toggle */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilterScope('BRANCH')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                filterScope === 'BRANCH' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Branch ({activeBranch.code})
            </button>
            <button
              onClick={() => setFilterScope('ALL')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                filterScope === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Enterprise Consolidated
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs transition-colors shadow"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-400">
            Rs. {metrics.totalSalesRevenue.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">Billed POS receipts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black font-mono text-blue-400">
            Rs. {metrics.totalGrossProfit.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">After COGS deduction</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Transactions</span>
            <ShoppingCart className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black font-mono text-white">
            {metrics.totalTransactions}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">Customer checkouts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Average Basket</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-400">
            Rs. {metrics.averageBasketValue.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">Per retail shopper</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Low Stock SKUs</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black font-mono text-rose-400">
            {metrics.lowStockItemsCount}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">Below reorder point</p>
        </div>
      </div>

      {/* 2-Column Middle Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Products by Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Top Velocity Retail SKUs
          </h3>

          <div className="space-y-3">
            {metrics.topSellingProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No sales recorded yet.</p>
            ) : (
              metrics.topSellingProducts.map((p, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">{p.name}</span>
                    <span className="font-mono font-bold text-emerald-400">Rs. {p.revenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (p.revenue / (metrics.totalSalesRevenue || 1)) * 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>SKU: {p.sku}</span>
                    <span>{p.unitsSold} units moved</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hourly Store Traffic / Sales Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Hourly Store Traffic Curve (Peak Hours)
          </h3>

          <div className="h-48 flex items-end gap-1.5 pt-4">
            {metrics.hourlySales.slice(0, 14).map((h, idx) => {
              const maxRev = Math.max(...metrics.hourlySales.map(item => item.revenue), 100);
              const heightPercent = Math.max(8, (h.revenue / maxRev) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-blue-600/80 group-hover:bg-blue-500 rounded-t transition-all"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-500 rotate-[-45deg] origin-top-left mt-2">
                    {h.hour}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 text-center pt-2">
            Staffing recommendation: Peak supermarket hours observed around 17:00 - 20:00.
          </p>
        </div>
      </div>

      {/* Cashier Shift Audit & Variance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <User className="w-4 h-4 text-amber-400" />
          Cash Drawer Settlements & Blind Drop Variance Log
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Shift ID</th>
                <th className="py-2.5 px-3">Branch & Lane</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-3 text-right">Opening Float</th>
                <th className="py-2.5 px-3 text-right">Cash Billed</th>
                <th className="py-2.5 px-3 text-right">Expected Drawer</th>
                <th className="py-2.5 px-3 text-right">Declared Actual</th>
                <th className="py-2.5 px-3 text-center">Variance (Short/Over)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {cashierSessions.map(sess => (
                <tr key={sess.id} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-bold text-white">{sess.sessionId}</td>
                  <td className="py-2 px-3 font-sans text-slate-300">{sess.branchName}</td>
                  <td className="py-2 px-3 font-sans text-slate-200">{sess.cashierName}</td>
                  <td className="py-2 px-3 text-right">Rs. {sess.openingCash.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">Rs. {sess.totalSalesCash.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right">
                    {sess.closingCashExpected ? `Rs. ${sess.closingCashExpected.toFixed(2)}` : 'In Progress'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-white">
                    {sess.closingCashActual ? `Rs. ${sess.closingCashActual.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-center font-bold">
                    {sess.variance !== undefined ? (
                      <span className={sess.variance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {sess.variance >= 0 ? '+' : ''}Rs. {sess.variance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sess.status === 'OPEN'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {sess.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
