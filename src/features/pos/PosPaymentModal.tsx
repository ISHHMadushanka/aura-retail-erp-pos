import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Award, Ticket, X, Check, AlertCircle } from 'lucide-react';
import { Customer, PaymentEntry } from '../../types/erp';

interface PosPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customer?: Customer;
  onCompleteSale: (payments: PaymentEntry[], amountTendered: number, pointsToRedeem: number) => void;
}

export const PosPaymentModal: React.FC<PosPaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  customer,
  onCompleteSale
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'CREDIT_CARD' | 'LOYALTY_POINTS' | 'GIFT_VOUCHER'>('CASH');
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setTenderedInput(grandTotal.toString());
      setPointsToRedeem(0);
      setErrorMsg('');
    }
  }, [isOpen, grandTotal]);

  if (!isOpen) return null;

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = Math.max(0, Number((grandTotal - totalPaid).toFixed(2)));

  const handleAddPayment = () => {
    const amount = parseFloat(tenderedInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid payment amount');
      return;
    }

    if (selectedMethod === 'LOYALTY_POINTS') {
      if (!customer) {
        setErrorMsg('No loyalty customer attached to this sale');
        return;
      }
      if (amount > customer.loyaltyPoints) {
        setErrorMsg(`Customer only has ${customer.loyaltyPoints} points available`);
        return;
      }
      setPointsToRedeem(prev => prev + amount);
    }

    const newPayment: PaymentEntry = {
      method: selectedMethod,
      amount: Math.min(amount, remaining > 0 ? remaining : amount),
      referenceNumber: selectedMethod === 'CREDIT_CARD' ? 'TX-' + Date.now().toString().slice(-4) : undefined
    };

    const nextPayments = [...payments, newPayment];
    setPayments(nextPayments);
    setErrorMsg('');

    const newTotalPaid = nextPayments.reduce((acc, p) => acc + p.amount, 0);
    const newRemaining = Math.max(0, Number((grandTotal - newTotalPaid).toFixed(2)));
    setTenderedInput(newRemaining > 0 ? newRemaining.toString() : '0');
  };

  const handleRemovePayment = (index: number) => {
    const removed = payments[index];
    if (removed.method === 'LOYALTY_POINTS') {
      setPointsToRedeem(prev => Math.max(0, prev - removed.amount));
    }
    setPayments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleQuickCash = (amount: number) => {
    setSelectedMethod('CASH');
    setTenderedInput(amount.toString());
  };

  const handleFinalize = () => {
    // If no payments added yet, assume user is paying full in current selected method
    let finalPayments = [...payments];
    let totalTendered = finalPayments.reduce((acc, p) => acc + p.amount, 0);

    if (finalPayments.length === 0) {
      const inputAmount = parseFloat(tenderedInput) || grandTotal;
      if (inputAmount < grandTotal && selectedMethod === 'CASH') {
        setErrorMsg(`Amount tendered is less than Grand Total (Rs. ${grandTotal.toFixed(2)})`);
        return;
      }
      finalPayments = [{
        method: selectedMethod,
        amount: grandTotal,
        referenceNumber: selectedMethod === 'CREDIT_CARD' ? 'TX-' + Date.now().toString().slice(-4) : undefined
      }];
      totalTendered = inputAmount;
    }

    const effectivePaid = finalPayments.reduce((acc, p) => acc + p.amount, 0);
    if (effectivePaid < grandTotal) {
      setErrorMsg(`Balance of Rs. ${(grandTotal - effectivePaid).toFixed(2)} remaining. Add payment tender.`);
      return;
    }

    const actualTendered = selectedMethod === 'CASH' && parseFloat(tenderedInput) > effectivePaid
      ? parseFloat(tenderedInput)
      : totalTendered;

    onCompleteSale(finalPayments, actualTendered, pointsToRedeem);
  };

  const changeDue = Math.max(0, Number(((parseFloat(tenderedInput) || totalPaid) - grandTotal).toFixed(2)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Payment Tender (Checkout)</h3>
            <p className="text-xs text-slate-400">Select payment methods or split tender across cash/card/loyalty</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Banner: Total Due */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Grand Total Payable</p>
              <p className="text-3xl font-black text-emerald-400 font-mono">Rs. {grandTotal.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-semibold">Balance Remaining</p>
              <p className={`text-2xl font-bold font-mono ${remaining > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                Rs. {remaining.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
              { id: 'LOYALTY_POINTS', label: 'Loyalty Pts', icon: Award },
              { id: 'GIFT_VOUCHER', label: 'Voucher', icon: Ticket }
            ].map(m => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id as any)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md ring-1 ring-emerald-500'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Amount input & Quick Denominations */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex justify-between">
              <span>Amount for {selectedMethod.replace('_', ' ')}</span>
              {selectedMethod === 'LOYALTY_POINTS' && customer && (
                <span className="text-purple-400">Available: {customer.loyaltyPoints} Pts</span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={tenderedInput}
                onChange={e => setTenderedInput(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xl font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddPayment}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 rounded-lg"
              >
                + Add Split
              </button>
            </div>

            {/* Quick Cash Buttons */}
            {selectedMethod === 'CASH' && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[grandTotal, 1000, 2000, 5000, 10000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickCash(amt)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-300 rounded border border-slate-700"
                  >
                    Rs. {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Applied Split Payments List */}
          {payments.length > 0 && (
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Applied Tenders</p>
              {payments.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                  <span className="font-semibold text-slate-300">{p.method}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">Rs. {p.amount.toFixed(2)}</span>
                    <button
                      onClick={() => handleRemovePayment(idx)}
                      className="text-rose-400 hover:text-rose-300 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Change calculation */}
          {selectedMethod === 'CASH' && parseFloat(tenderedInput) > grandTotal && (
            <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 font-mono text-sm">
              <span className="font-bold">CHANGE TO RETURN:</span>
              <span className="text-lg font-black">Rs. {changeDue.toFixed(2)}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalize}
            className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
          >
            <Check className="w-5 h-5" />
            Complete Checkout (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};
