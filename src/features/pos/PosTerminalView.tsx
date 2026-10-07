import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode, Search, Plus, Minus, Trash2, PauseCircle, PlayCircle,
  CreditCard, DollarSign, UserCheck, ShieldAlert, Award, Tag,
  Layers, Package, AlertCircle, Sparkles, RefreshCw, ShoppingCart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { CartItem, Customer, Product, Sale, CashSession, PaymentEntry } from '../../types/erp';
import { PosService } from '../../services/posService';
import { db } from '../../services/db/store';
import { PosPaymentModal } from './PosPaymentModal';
import { PosReceiptModal } from './PosReceiptModal';
import { PosShiftModal } from './PosShiftModal';
import { PosHoldBillsModal } from './PosHoldBillsModal';
import { SupervisorPinModal } from '../../components/common/SupervisorPinModal';

export const PosTerminalView: React.FC = () => {
  const { currentUser, activeBranch, activeTerminal, hasPermission } = useAuth();
  const { success, warning, error: notifyError } = useNotification();

  // Active POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [mobilePosTab, setMobilePosTab] = useState<'CART' | 'CATALOG'>('CART');

  // Modals state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isHoldBillsOpen, setIsHoldBillsOpen] = useState(false);
  const [supervisorModal, setSupervisorModal] = useState<{
    isOpen: boolean;
    actionTitle: string;
    actionDescription: string;
    onAuthorized: (supervisorName: string) => void;
  }>({
    isOpen: false,
    actionTitle: '',
    actionDescription: '',
    onAuthorized: () => {}
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Get active cash session for current cashier & terminal
  const [activeSession, setActiveSession] = useState<CashSession | null>(() => {
    return db.collection('cashSessions').findOne(
      (s: CashSession) => s.branchId === activeBranch.id && s.status === 'OPEN' && s.cashierId === currentUser.id
    ) || null;
  });

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Update customer object when dropdown changes
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = db.collection('customers').findById(selectedCustomerId);
      setSelectedCustomer(cust);
    } else {
      setSelectedCustomer(undefined);
    }
  }, [selectedCustomerId]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    const term = barcodeInput.trim();
    if (!term) return;

    const product = PosService.lookupProduct(term);
    if (!product) {
      notifyError('Product Not Found', `Barcode / SKU "${term}" does not match any active product.`);
      setBarcodeInput('');
      return;
    }

    addProductToCart(product);
    setBarcodeInput('');
    playBeep();
  };

  const addProductToCart = (product: Product, quantityToAdd: number = 1) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.productId === product.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        const updatedQty = Number((next[existingIdx].quantity + quantityToAdd).toFixed(3));
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: updatedQty
        };
        return next;
      } else {
        const newItem: CartItem = {
          id: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
          productId: product.id,
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          unit: product.unit,
          quantity: quantityToAdd,
          unitPrice: product.sellingPrice,
          originalPrice: product.sellingPrice,
          taxRate: product.taxRate,
          taxAmount: 0,
          discountAmount: 0,
          netTotal: product.sellingPrice * quantityToAdd,
          isWeighable: product.isWeighable
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCart(prev =>
      prev.map(it => (it.id === itemId ? { ...it, quantity: Number(newQty.toFixed(3)) } : it))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    const item = cart.find(it => it.id === itemId);
    if (!item) return;

    // Check permission for item void
    if (hasPermission('pos.void_item')) {
      setCart(prev => prev.filter(it => it.id !== itemId));
      warning('Line Voided', `${item.name} removed from cart`);
    } else {
      // Require Supervisor PIN
      setSupervisorModal({
        isOpen: true,
        actionTitle: 'LINE VOID AUTHORIZATION',
        actionDescription: `Cashier requesting deletion of line: ${item.name}`,
        onAuthorized: (supName) => {
          setCart(prev => prev.filter(it => it.id !== itemId));
          success('Void Approved', `Line voided by supervisor ${supName}`);
        }
      });
    }
  };

  const handleVoidEntireCart = () => {
    if (!cart.length) return;

    if (hasPermission('pos.void_bill')) {
      setCart([]);
      warning('Bill Voided', 'Entire active transaction was voided.');
    } else {
      setSupervisorModal({
        isOpen: true,
        actionTitle: 'TRANSACTION VOID AUTHORIZATION',
        actionDescription: `Cashier requesting entire transaction cancellation (${cart.length} items)`,
        onAuthorized: (supName) => {
          setCart([]);
          success('Bill Void Approved', `Transaction voided by supervisor ${supName}`);
        }
      });
    }
  };

  const handleHoldBill = () => {
    if (!cart.length) {
      warning('Cart is empty', 'Cannot suspend an empty transaction.');
      return;
    }
    if (!activeSession) {
      notifyError('No Open Shift', 'Please open a cash shift first.');
      return;
    }

    const { subtotal, discountTotal, taxTotal, grandTotal } = PosService.calculateCart(cart);
    PosService.holdBill(
      {
        companyId: currentUser.companyId,
        branchId: activeBranch.id,
        warehouseId: 'wh_cmb_floor',
        terminalId: activeTerminal?.terminalCode || 'POS-01',
        cashSessionId: activeSession.id,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.fullName,
        items: cart,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal
      },
      currentUser
    );

    setCart([]);
    setSelectedCustomerId('');
    success('Transaction Suspended', 'Bill placed on hold. Ready for next customer.');
  };

  const handleRecallSale = (recalledSale: Sale) => {
    setCart(recalledSale.items);
    if (recalledSale.customerId) {
      setSelectedCustomerId(recalledSale.customerId);
    }
    success('Bill Recalled', `Transaction ${recalledSale.saleNumber} loaded to cart.`);
  };

  const handleFinalizeSale = async (
    payments: PaymentEntry[],
    amountTendered: number,
    pointsToRedeem: number
  ) => {
    if (!activeSession) {
      notifyError('No Active Shift', 'Cannot checkout without an open shift.');
      return;
    }

    try {
      const sale = await PosService.completeSale({
        companyId: currentUser.companyId,
        branchId: activeBranch.id,
        warehouseId: 'wh_cmb_floor',
        terminalId: activeTerminal?.terminalCode || 'POS-01',
        cashSessionId: activeSession.id,
        cashier: currentUser,
        customer: selectedCustomer,
        items: cart,
        payments,
        amountTendered,
        pointsToRedeem
      });

      setCompletedSale(sale);
      setIsPaymentOpen(false);
      setIsReceiptOpen(true);
      setCart([]);
      setSelectedCustomerId('');
      playBeep();
      success('Sale Completed', `Invoice ${sale.saleNumber} generated.`);
    } catch (err: any) {
      notifyError('Sale Failed', err.message || 'Could not process sale');
    }
  };

  // Recompute live cart calculations
  const { subtotal, discountTotal, taxTotal, grandTotal, appliedPromotions } = PosService.calculateCart(cart);

  // Filter products for quick touch tiles
  const allProducts = db.collection('products').find((p: Product) => p.isActive);
  const categories = db.collection('categories').find();
  const customers = db.collection('customers').find();
  const suspendedCount = db.collection('suspendedSales').find(
    (s: Sale) => s.branchId === activeBranch.id && s.status === 'SUSPENDED'
  ).length;

  const quickProducts = activeCategoryFilter === 'ALL'
    ? allProducts.slice(0, 12)
    : allProducts.filter((p: Product) => p.departmentId === activeCategoryFilter || p.categoryId === activeCategoryFilter);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* POS Top Utility Status Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            LANE: {activeTerminal?.terminalCode || 'POS-01'}
          </span>
          <span className="text-slate-400 font-mono">| {activeBranch.name}</span>
          <span className="text-slate-400">| Cashier: <strong className="text-slate-200">{currentUser.fullName}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Shift Badge */}
          {activeSession ? (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold hover:bg-emerald-900 transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Shift: {activeSession.sessionId}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-colors animate-pulse"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>OPEN CASH SHIFT</span>
            </button>
          )}

          {/* Held Bills Counter */}
          <button
            onClick={() => setIsHoldBillsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Held ({suspendedCount})</span>
          </button>
        </div>
      </div>

      {/* Mobile Screen Segmented Switcher */}
      <div className="lg:hidden flex bg-slate-900 border-b border-slate-800 p-1.5 gap-1 shrink-0">
        <button
          onClick={() => setMobilePosTab('CART')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
            mobilePosTab === 'CART'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Cart & Checkout ({cart.length})</span>
        </button>
        <button
          onClick={() => setMobilePosTab('CATALOG')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
            mobilePosTab === 'CATALOG'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Quick Product Catalog</span>
        </button>
      </div>

      {/* Main 2-Column POS Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: BARCODE SCANNER, CART TABLE, TOTALS & TENDER */}
        <div
          className={`w-full lg:w-7/12 flex-col border-r border-slate-800 bg-slate-900/60 overflow-hidden ${
            mobilePosTab === 'CART' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          {/* Barcode Fast Input Bar */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex gap-2">
            <form onSubmit={handleScanBarcode} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-5 h-5 text-emerald-400 absolute left-3 top-2.5" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan barcode or enter SKU (e.g. 4792011001011 or SKU-DAIRY-001)..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-inner"
                />
              </div>
              <button
                type="submit"
                className="px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                Scan
              </button>
            </form>

            {/* Loyalty Customer Select */}
            <div className="relative">
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg text-xs py-2 px-2.5 text-slate-200 focus:outline-none focus:border-purple-500 max-w-[160px] truncate"
              >
                <option value="">+ Loyalty Member</option>
                {customers.map((c: Customer) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.loyaltyPoints} Pts)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Loyalty Banner if attached */}
          {selectedCustomer && (
            <div className="px-4 py-2 bg-purple-950/40 border-b border-purple-900/50 flex items-center justify-between text-xs text-purple-300">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">{selectedCustomer.fullName}</span>
                <span className="text-[10px] bg-purple-900/80 px-1.5 py-0.5 rounded font-bold font-mono">
                  {selectedCustomer.loyaltyTier}
                </span>
              </div>
              <div className="font-mono">
                <span>Available Rewards: <strong>{selectedCustomer.loyaltyPoints} Pts</strong></span>
              </div>
            </div>
          )}

          {/* Cart Items Table */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <Barcode className="w-16 h-16 opacity-30 mb-3" />
                <p className="font-semibold text-sm text-slate-400">Cart is empty</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Scan products using a physical barcode scanner or tap quick buttons on the right.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-2 text-center w-28">Qty</th>
                    <th className="py-2.5 px-2 text-right">Price</th>
                    <th className="py-2.5 px-2 text-right">Disc</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cart.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-sans">
                        <div className="font-bold text-slate-100">{item.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{item.barcode}</span>
                          {item.discountReason && (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <Sparkles className="w-3 h-3" /> {item.discountReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="inline-flex items-center bg-slate-950 border border-slate-700 rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step={item.isWeighable ? '0.05' : '1'}
                            value={item.quantity}
                            onChange={e => handleUpdateQuantity(item.id, parseFloat(e.target.value) || 1)}
                            className="w-12 text-center bg-transparent text-xs font-bold text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="px-2 py-1 hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right text-slate-300">
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-400">
                        {item.discountAmount > 0 ? `-${item.discountAmount.toFixed(2)}` : '0.00'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-white">
                        {item.netTotal.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Void Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Applied Promotions Notification */}
          {appliedPromotions.length > 0 && (
            <div className="px-3 py-1.5 bg-emerald-950/50 border-t border-emerald-900/60 flex items-center gap-2 text-[11px] text-emerald-300 overflow-x-auto">
              <Tag className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="font-semibold">Active Deals Applied:</span>
              {appliedPromotions.map((p, idx) => (
                <span key={idx} className="bg-emerald-900/60 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
                  {p}
                </span>
              ))}
            </div>
          )}

          {/* Cart Bottom Summary & Checkout Tender Bar */}
          <div className="bg-slate-950 border-t border-slate-800 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Subtotal</span>
                <p className="font-mono text-base font-bold text-slate-200">Rs. {subtotal.toFixed(2)}</p>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold">Discounts</span>
                <p className="font-mono text-base font-bold text-emerald-400">
                  {discountTotal > 0 ? `-Rs. ${discountTotal.toFixed(2)}` : 'Rs. 0.00'}
                </p>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Taxes (VAT)</span>
                <p className="font-mono text-base font-bold text-slate-300">Rs. {taxTotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Grand Total Bar and Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">NET PAYABLE TOTAL</span>
                <p className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                  Rs. {grandTotal.toFixed(2)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleVoidEntireCart}
                  disabled={!cart.length}
                  className="px-3 py-3 bg-slate-900 hover:bg-rose-950/70 border border-slate-800 hover:border-rose-800/80 text-rose-400 disabled:opacity-40 rounded-xl font-bold text-xs transition-colors"
                  title="Void Transaction"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleHoldBill}
                  disabled={!cart.length}
                  className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 disabled:opacity-40 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Hold</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(true)}
                  disabled={!cart.length || !activeSession}
                  className="flex-1 sm:flex-none px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 text-slate-950 font-black rounded-xl text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-950"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>TENDER (PAY)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CATEGORY TABS & TOUCH PRODUCT TILES */}
        <div
          className={`w-full lg:w-5/12 flex-col bg-slate-950 overflow-hidden ${
            mobilePosTab === 'CATALOG' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          {/* Department / Category Tabs */}
          <div className="p-2 bg-slate-900/90 border-b border-slate-800 flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                  activeCategoryFilter === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Quick Product Touch Grid */}
          <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5 content-start">
            {quickProducts.map((prod: Product) => (
              <button
                key={prod.id}
                onClick={() => {
                  addProductToCart(prod);
                  playBeep();
                }}
                className="flex flex-col justify-between p-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 active:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group shadow-sm"
              >
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 group-hover:text-emerald-400">
                    {prod.unit}
                  </span>
                  <p className="text-xs font-bold text-slate-200 line-clamp-2 mt-0.5 leading-snug">
                    {prod.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{prod.sku}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Rs. {prod.sellingPrice.toFixed(2)}
                  </span>
                  <div className="w-5 h-5 rounded-full bg-slate-800 group-hover:bg-emerald-600 group-hover:text-slate-950 flex items-center justify-center text-slate-400 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* POS Dialogs */}
      <PosPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        grandTotal={grandTotal}
        customer={selectedCustomer}
        onCompleteSale={handleFinalizeSale}
      />

      <PosReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
      />

      <PosShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        activeSession={activeSession}
        onSessionUpdated={(sess) => setActiveSession(sess.status === 'OPEN' ? sess : null)}
        currentUser={currentUser}
        branchId={activeBranch.id}
        terminalId={activeTerminal?.terminalCode || 'POS-01'}
      />

      <PosHoldBillsModal
        isOpen={isHoldBillsOpen}
        onClose={() => setIsHoldBillsOpen(false)}
        branchId={activeBranch.id}
        onRecallSale={handleRecallSale}
      />

      <SupervisorPinModal
        isOpen={supervisorModal.isOpen}
        onClose={() => setSupervisorModal(prev => ({ ...prev, isOpen: false }))}
        onAuthorized={supervisorModal.onAuthorized}
        actionTitle={supervisorModal.actionTitle}
        actionDescription={supervisorModal.actionDescription}
      />
    </div>
  );
};
