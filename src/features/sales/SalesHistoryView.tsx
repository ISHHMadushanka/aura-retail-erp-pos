import React, { useState } from 'react';
import { Receipt, Search, Eye, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { db } from '../../services/db/store';
import { Sale } from '../../types/erp';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { PosReceiptModal } from '../pos/PosReceiptModal';
import { InventoryService } from '../../services/inventoryService';
import { AuditService } from '../../services/auditService';
import { SupervisorPinModal } from '../../components/common/SupervisorPinModal';

export const SalesHistoryView: React.FC = () => {
  const { activeBranch, currentUser, hasPermission } = useAuth();
  const { success, warning, error: notifyError } = useNotification();

  const [search, setSearch] = useState('');
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [supervisorModal, setSupervisorModal] = useState<{
    isOpen: boolean;
    saleToRefund: Sale | null;
  }>({
    isOpen: false,
    saleToRefund: null
  });

  const sales = db.collection('sales').find(
    (s: Sale) => s.branchId === activeBranch.id
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredSales = sales.filter((s: Sale) => {
    return (
      s.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleInitiateRefund = (sale: Sale) => {
    if (sale.status === 'RETURNED') {
      warning('Already Refunded', 'This transaction has already been refunded.');
      return;
    }

    if (hasPermission('pos.refund')) {
      executeRefund(sale, currentUser.fullName);
    } else {
      setSupervisorModal({
        isOpen: true,
        saleToRefund: sale
      });
    }
  };

  const executeRefund = (sale: Sale, supervisorName: string) => {
    try {
      db.collection('sales').updateOne(
        (s: Sale) => s.id === sale.id,
        { status: 'RETURNED' }
      );

      // Return items to inventory via double-entry stock ledger
      for (const item of sale.items) {
        InventoryService.recordMovement({
          companyId: sale.companyId,
          branchId: sale.branchId,
          warehouseId: sale.warehouseId,
          productId: item.productId,
          quantityChange: item.quantity,
          transactionType: 'SALE_RETURN',
          referenceType: 'SALE',
          referenceId: `RET-${sale.saleNumber}`,
          unitCost: item.unitPrice * 0.7,
          notes: `Customer return authorized by ${supervisorName}`,
          user: currentUser
        });
      }

      AuditService.log(
        currentUser,
        'SALE_REFUND_EXECUTED',
        'SALES',
        sale.id,
        { status: 'COMPLETED' },
        { status: 'RETURNED', supervisor: supervisorName },
        activeBranch.id
      );

      success('Refund Processed', `Sale ${sale.saleNumber} returned and stock restored.`);
      setSupervisorModal({ isOpen: false, saleToRefund: null });
    } catch (err: any) {
      notifyError('Refund Failed', err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            Sales Invoices & Billing Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Real-time branch sales receipts, customer invoices, and supervisor-authorized returns
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 max-w-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by invoice #, cashier, or customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Sales Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
            <tr>
              <th className="py-3 px-4">Invoice # & Date</th>
              <th className="py-3 px-3">Terminal Lane</th>
              <th className="py-3 px-3">Cashier</th>
              <th className="py-3 px-3">Customer</th>
              <th className="py-3 px-3 text-right">Items Count</th>
              <th className="py-3 px-3 text-right">Grand Total</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {filteredSales.map((sale: Sale) => (
              <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-sans">
                  <div className="font-bold text-white font-mono text-xs">{sale.saleNumber}</div>
                  <div className="text-[10px] text-slate-400">{new Date(sale.createdAt).toLocaleString()}</div>
                </td>
                <td className="py-3 px-3 text-emerald-400 font-bold">{sale.terminalId}</td>
                <td className="py-3 px-3 font-sans text-slate-200">{sale.cashierName}</td>
                <td className="py-3 px-3 font-sans text-slate-300">
                  {sale.customerName ? (
                    <span className="text-purple-400">{sale.customerName}</span>
                  ) : (
                    <span className="text-slate-500">Walk-in Customer</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right">{sale.items.length}</td>
                <td className="py-3 px-3 text-right font-bold text-white">
                  Rs. {sale.grandTotal.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      sale.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {sale.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-sans">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedSaleForView(sale);
                        setIsReceiptModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                      title="View Receipt"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {sale.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleInitiateRefund(sale)}
                        className="p-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 rounded-md transition-colors"
                        title="Return / Refund Sale"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PosReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={selectedSaleForView}
      />

      <SupervisorPinModal
        isOpen={supervisorModal.isOpen}
        onClose={() => setSupervisorModal({ isOpen: false, saleToRefund: null })}
        actionTitle="REFUND AUTHORIZATION"
        actionDescription={
          supervisorModal.saleToRefund
            ? `Authorizing return for ${supervisorModal.saleToRefund.saleNumber} (Rs. ${supervisorModal.saleToRefund.grandTotal.toFixed(2)})`
            : ''
        }
        onAuthorized={(supName) => {
          if (supervisorModal.saleToRefund) {
            executeRefund(supervisorModal.saleToRefund, supName);
          }
        }}
      />
    </div>
  );
};
