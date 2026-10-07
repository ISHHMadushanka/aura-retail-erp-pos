import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Users, Truck, ShoppingCart, ArrowRight } from 'lucide-react';
import { db } from '../../services/db/store';
import { Product, Customer, Supplier, Sale } from '../../types/erp';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (type: 'PRODUCT' | 'CUSTOMER' | 'SUPPLIER' | 'SALE', id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onSelectAction }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Toggle from parent or handled globally
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();
  
  const products: Product[] = trimmed
    ? db.collection('products').find((p: Product) =>
        p.name.toLowerCase().includes(trimmed) ||
        p.sku.toLowerCase().includes(trimmed) ||
        p.barcode.toLowerCase().includes(trimmed)
      ).slice(0, 5)
    : [];

  const customers: Customer[] = trimmed
    ? db.collection('customers').find((c: Customer) =>
        Boolean(
          c.fullName.toLowerCase().includes(trimmed) ||
          c.phone.includes(trimmed) ||
          (c.loyaltyCardNumber && c.loyaltyCardNumber.toLowerCase().includes(trimmed))
        )
      ).slice(0, 3)
    : [];

  const suppliers: Supplier[] = trimmed
    ? db.collection('suppliers').find((s: Supplier) =>
        s.name.toLowerCase().includes(trimmed) ||
        s.code.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const sales: Sale[] = trimmed
    ? db.collection('sales').find((s: Sale) =>
        s.saleNumber.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const hasResults = products.length > 0 || customers.length > 0 || suppliers.length > 0 || sales.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-16">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Omni Search: Type product name, barcode (e.g. 4792...), customer phone, supplier, or invoice #..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!trimmed && (
            <div className="text-center py-8 text-slate-500 text-xs">
              <p>Type keywords to search across products, SKU, barcodes, suppliers, customer loyalty, and sales invoices.</p>
              <div className="flex justify-center gap-2 mt-3 text-[11px] text-slate-400">
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">ESC to exit</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Ctrl + K omni</span>
              </div>
            </div>
          )}

          {trimmed && !hasResults && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No matching records found for "{query}".
            </div>
          )}

          {products.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-400" /> Products & SKUs
              </p>
              <div className="space-y-1">
                {products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectAction('PRODUCT', p.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">{p.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        SKU: {p.sku} | Barcode: {p.barcode} | Unit: {p.unit}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono">Rs. {p.sellingPrice.toFixed(2)}</span>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {customers.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400" /> Customers & Loyalty
              </p>
              <div className="space-y-1">
                {customers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectAction('CUSTOMER', c.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{c.fullName}</p>
                      <p className="text-[11px] text-slate-400">Phone: {c.phone} | Card: {c.loyaltyCardNumber || 'N/A'}</p>
                    </div>
                    <span className="text-xs font-semibold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                      {c.loyaltyPoints} Pts ({c.loyaltyTier})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {suppliers.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-400" /> Suppliers & Vendors
              </p>
              <div className="space-y-1">
                {suppliers.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectAction('SUPPLIER', s.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Code: {s.code} | Contact: {s.contactPerson}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-300">Terms: {s.paymentTermsDays} Days</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sales.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" /> Invoices & Sales
              </p>
              <div className="space-y-1">
                {sales.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectAction('SALE', s.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-left transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white font-mono">{s.saleNumber}</p>
                      <p className="text-[11px] text-slate-400">Cashier: {s.cashierName} | {new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">Rs. {s.grandTotal.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
