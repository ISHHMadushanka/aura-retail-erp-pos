import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../types/erp';
import { db } from '../../services/db/store';

interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({ isOpen, onClose, sale }) => {
  if (!isOpen || !sale) return null;

  const company = db.collection('companies').findById(sale.companyId) || {
    name: 'AURA SUPERMARKET RETAIL PLC',
    address: 'No. 120, Galle Road, Colombo 03',
    taxNumber: 'VAT-8910442-000',
    phone: '+94 11 234 5678',
    currencySymbol: 'Rs. '
  };

  const branch = db.collection('branches').findById(sale.branchId) || {
    name: 'Colombo Flagship Supermarket',
    address: '250 Union Place, Colombo 02',
    phone: '+94 11 789 0001'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-sm text-white">Payment Received • Sale Completed</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Simulation Container */}
        <div className="p-6 bg-slate-950/40 flex justify-center">
          <div
            id="printable-thermal-receipt"
            className="w-full max-w-[320px] bg-white text-black font-mono text-[11px] p-5 shadow-xl rounded border border-slate-200"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400">
              <h2 className="font-black text-sm uppercase tracking-wider">{company.name}</h2>
              <p className="text-[10px] text-gray-700">{branch.name}</p>
              <p className="text-[9px] text-gray-600">{branch.address}</p>
              <p className="text-[9px] text-gray-600">Tel: {branch.phone}</p>
              <p className="text-[9px] text-gray-600 font-bold mt-1">VAT Reg No: {company.taxNumber}</p>
            </div>

            {/* Transaction Metadata */}
            <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>INVOICE #:</span>
                <span className="font-bold">{sale.saleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span>{new Date(sale.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{sale.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="truncate max-w-[150px]">{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="py-2 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold text-[10px] mb-1.5 pb-1 border-b border-gray-300">
                <span className="w-1/2">ITEM</span>
                <span className="w-1/4 text-center">QTY</span>
                <span className="w-1/4 text-right">AMOUNT</span>
              </div>
              <div className="space-y-1">
                {sale.items.map(item => (
                  <div key={item.id} className="text-[10px]">
                    <div className="flex justify-between">
                      <span className="truncate w-1/2 font-semibold">{item.name}</span>
                      <span className="w-1/4 text-center">{item.quantity} {item.unit}</span>
                      <span className="w-1/4 text-right font-bold">{(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.discountAmount > 0 && (
                      <div className="flex justify-between text-[9px] text-gray-600 pl-2">
                        <span>* Promo: {item.discountReason || 'Discount'}</span>
                        <span>-{item.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>{company.currencySymbol}{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>TOTAL DISCOUNTS:</span>
                  <span>-{company.currencySymbol}{sale.discountTotal.toFixed(2)}</span>
                </div>
              )}
              {sale.taxTotal > 0 && (
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>VAT / TAX TOTAL:</span>
                  <span>{company.currencySymbol}{sale.taxTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black border-t border-black pt-1 mt-1">
                <span>TOTAL PAYABLE:</span>
                <span>{company.currencySymbol}{sale.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Tender Breakdown */}
            <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>TENDER ({p.method}):</span>
                  <span>{company.currencySymbol}{p.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold">
                <span>CHANGE GIVEN:</span>
                <span>{company.currencySymbol}{sale.changeGiven.toFixed(2)}</span>
              </div>
            </div>

            {/* Loyalty Details */}
            {sale.pointsEarned > 0 && (
              <div className="py-2 border-b border-dashed border-gray-400 text-[10px] text-center bg-gray-100 p-1.5 rounded">
                <p className="font-bold">LOYALTY REWARDS</p>
                <p>Points Earned on this bill: +{sale.pointsEarned}</p>
                {sale.pointsRedeemed > 0 && <p>Points Redeemed: -{sale.pointsRedeemed}</p>}
              </div>
            )}

            {/* Footer & Barcode Emulation */}
            <div className="pt-3 text-center text-[9px] space-y-1">
              <p className="font-bold">THANK YOU FOR SHOPPING WITH US!</p>
              <p>Exchange possible within 7 days with bill.</p>
              <div className="py-2 font-mono tracking-widest text-center text-[10px] font-black border-y border-gray-200">
                |||| || | |||| ||||| || ||| ||||
              </div>
              <p className="text-[8px] text-gray-500">POS Engine by AuraRetail • ESC/POS Ready</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors"
          >
            New Sale (Esc)
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
