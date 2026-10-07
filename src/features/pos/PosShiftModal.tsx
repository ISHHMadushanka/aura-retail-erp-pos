import React, { useState } from 'react';
import { DollarSign, X, Check, FileText, AlertTriangle } from 'lucide-react';
import { CashSession, User } from '../../types/erp';
import { PosService } from '../../services/posService';
import { db } from '../../services/db/store';

interface PosShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: CashSession | null;
  onSessionUpdated: (session: CashSession) => void;
  currentUser: User;
  branchId: string;
  terminalId: string;
}

export const PosShiftModal: React.FC<PosShiftModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onSessionUpdated,
  currentUser,
  branchId,
  terminalId
}) => {
  const [openingFloat, setOpeningFloat] = useState('15000');
  const [declaredCash, setDeclaredCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [zReportData, setZReportData] = useState<CashSession | null>(null);

  if (!isOpen) return null;

  const handleOpenShift = () => {
    const float = parseFloat(openingFloat);
    if (isNaN(float) || float < 0) return;

    const newSession: CashSession = {
      id: 'session_' + Date.now(),
      sessionId: `SHIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-3)}`,
      companyId: currentUser.companyId,
      branchId,
      terminalId,
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      openingCash: float,
      totalSalesCash: 0,
      totalSalesCard: 0,
      totalSalesOther: 0,
      transactionCount: 0,
      status: 'OPEN',
      notes: 'Shift initialized with opening float',
      openedAt: new Date().toISOString()
    };

    db.collection('cashSessions').insertOne(newSession);
    onSessionUpdated(newSession);
    onClose();
  };

  const handleCloseShift = () => {
    if (!activeSession) return;
    const actual = parseFloat(declaredCash);
    if (isNaN(actual) || actual < 0) return;

    const closed = PosService.closeShift(activeSession.id, actual, closingNotes, currentUser);
    setZReportData(closed);
    onSessionUpdated(closed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 text-slate-100">
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-bold text-sm text-white">
              {zReportData ? 'Z-Report (Shift Settlement)' : activeSession ? 'Close Shift & Blind Cash Drop' : 'Open POS Cash Shift'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* View 1: Shift Open View */}
          {!activeSession && !zReportData && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Enter the verified physical float inside the cash drawer before starting cashier operations on terminal <span className="font-mono text-emerald-400 font-bold">{terminalId}</span>.
              </p>
              <div>
                <label className="text-xs font-semibold text-slate-400">Opening Cash Float (Rs.)</label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={e => setOpeningFloat(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-2xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleOpenShift}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-sm transition-colors shadow-lg mt-2"
              >
                Confirm & Open Shift
              </button>
            </div>
          )}

          {/* View 2: Shift Close (Blind Declaration) */}
          {activeSession && !zReportData && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shift ID:</span>
                  <span className="font-mono text-slate-200">{activeSession.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Opened At:</span>
                  <span>{new Date(activeSession.openedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transactions Billed:</span>
                  <span className="font-bold text-emerald-400">{activeSession.transactionCount}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Blind Count: Enter Actual Cash in Drawer (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={declaredCash}
                  onChange={e => setDeclaredCash(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-amber-600/60 rounded-lg p-3 text-2xl font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Expected computer cash balance is hidden to guarantee honest blind reconciliation.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Shift Notes / Handover Comments</label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  placeholder="Optional comments for store manager..."
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <button
                onClick={handleCloseShift}
                disabled={!declaredCash}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-sm transition-colors shadow-lg"
              >
                Submit Blind Count & Generate Z-Report
              </button>
            </div>
          )}

          {/* View 3: Z-Report Audit Reveal */}
          {zReportData && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-center pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-sm text-white">TERMINAL Z-REPORT SETTLEMENT</h4>
                  <p className="text-[10px] text-slate-400">{zReportData.sessionId}</p>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Opening Float:</span>
                  <span>Rs. {zReportData.openingCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cash Sales:</span>
                  <span>+ Rs. {zReportData.totalSalesCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-800 pt-1 text-slate-300">
                  <span>Expected Drawer Cash:</span>
                  <span>Rs. {zReportData.closingCashExpected?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-white">
                  <span>Actual Declared Cash:</span>
                  <span>Rs. {zReportData.closingCashActual?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-800 pt-1">
                  <span>Variance:</span>
                  <span className={`${(zReportData.variance || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(zReportData.variance || 0) >= 0 ? '+' : ''}Rs. {zReportData.variance?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                  <span>Credit Card Sales:</span>
                  <span>Rs. {zReportData.totalSalesCard.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Other Tenders:</span>
                  <span>Rs. {zReportData.totalSalesOther.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs"
                >
                  Close Window
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  Print Z-Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
