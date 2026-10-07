import React from 'react';
import { PauseCircle, PlayCircle, X, Clock, ShoppingCart } from 'lucide-react';
import { Sale } from '../../types/erp';
import { db } from '../../services/db/store';
import { PosService } from '../../services/posService';

interface PosHoldBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onRecallSale: (sale: Sale) => void;
}

export const PosHoldBillsModal: React.FC<PosHoldBillsModalProps> = ({
  isOpen,
  onClose,
  branchId,
  onRecallSale
}) => {
  if (!isOpen) return null;

  const suspendedBills = db.collection('suspendedSales').find(
    (s: Sale) => s.branchId === branchId && s.status === 'SUSPENDED'
  );

  const handleRecall = (id: string) => {
    const sale = PosService.recallBill(id);
    if (sale) {
      onRecallSale(sale);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 text-slate-100">
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <PauseCircle className="w-5 h-5" />
            <h3 className="font-bold text-sm text-white">Suspended / Held Transactions</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          {suspendedBills.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No suspended bills on hold for this branch.</p>
            </div>
          ) : (
            suspendedBills.map((bill: Sale) => (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400">{bill.saleNumber}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(bill.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {bill.items.length} items • Cashier: {bill.cashierName}
                  </p>
                  {bill.customerName && (
                    <p className="text-[11px] text-purple-400">Customer: {bill.customerName}</p>
                  )}
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-xs font-mono font-bold text-emerald-400">Rs. {bill.grandTotal.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => handleRecall(bill.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Recall
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
