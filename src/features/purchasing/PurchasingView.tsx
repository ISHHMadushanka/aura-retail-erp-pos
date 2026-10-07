import React, { useState } from 'react';
import {
  ShoppingBag, Plus, Truck, FileText, CheckCircle2, Clock,
  AlertCircle, X, Check, Calendar, ArrowDownRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { db } from '../../services/db/store';
import { PurchaseOrder, Supplier, Product, GoodsReceivedNote } from '../../types/erp';
import { PurchasingService } from '../../services/purchasingService';

export const PurchasingView: React.FC = () => {
  const { currentUser, activeBranch, hasPermission } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [activeTab, setActiveTab] = useState<'PO' | 'GRN' | 'SUPPLIERS'>('PO');
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<PurchaseOrder | null>(null);

  // New PO State
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poExpectedDate, setPoExpectedDate] = useState('2026-10-15');
  const [poItems, setPoItems] = useState<Array<{ productId: string; orderedQty: number; unitCost: number }>>([]);

  // GRN State
  const [grnInvoiceNumber, setGrnInvoiceNumber] = useState('');
  const [grnReceivedItems, setGrnReceivedItems] = useState<Array<{
    productId: string;
    receivedQty: number;
    batchNumber: string;
    expiryDate: string;
  }>>([]);

  const purchaseOrders = db.collection('purchaseOrders').find(
    (po: PurchaseOrder) => po.branchId === activeBranch.id
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const goodsReceivedNotes = db.collection('goodsReceivedNotes').find(
    (grn: GoodsReceivedNote) => grn.branchId === activeBranch.id
  ).sort((a: any, b: any) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  const suppliers = db.collection('suppliers').find();
  const products = db.collection('products').find();

  const handleOpenNewPo = () => {
    setPoSupplierId(suppliers[0]?.id || '');
    setPoExpectedDate('2026-10-20');
    setPoItems([
      {
        productId: products[0]?.id || '',
        orderedQty: 50,
        unitCost: products[0]?.costPrice || 100
      }
    ]);
    setIsPoModalOpen(true);
  };

  const handleAddPoItemRow = () => {
    setPoItems(prev => [
      ...prev,
      {
        productId: products[0]?.id || '',
        orderedQty: 25,
        unitCost: products[0]?.costPrice || 100
      }
    ]);
  };

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || !poItems.length) {
      notifyError('Validation Failed', 'Supplier and at least one item required.');
      return;
    }

    try {
      const po = PurchasingService.createPurchaseOrder({
        companyId: currentUser.companyId,
        branchId: activeBranch.id,
        warehouseId: 'wh_cmb_floor',
        supplierId: poSupplierId,
        items: poItems,
        expectedDeliveryDate: poExpectedDate,
        user: currentUser
      });

      success('PO Created', `Purchase Order ${po.poNumber} created with status: ${po.status}`);
      setIsPoModalOpen(false);
    } catch (err: any) {
      notifyError('Failed to create PO', err.message);
    }
  };

  const handleOpenGrnForPo = (po: PurchaseOrder) => {
    setSelectedPoForGrn(po);
    setGrnInvoiceNumber(`INV-SUP-${Date.now().toString().slice(-4)}`);
    setGrnReceivedItems(
      po.items.map((i: any) => ({
        productId: i.productId,
        receivedQty: Math.max(0, i.orderedQty - (i.receivedQty || 0)),
        batchNumber: `BAT-${Date.now().toString().slice(-4)}`,
        expiryDate: '2027-12-31'
      }))
    );
    setIsGrnModalOpen(true);
  };

  const handlePostGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForGrn || !grnInvoiceNumber) {
      notifyError('Validation Failed', 'Supplier Invoice Number is required.');
      return;
    }

    try {
      const grn = await PurchasingService.receiveGRN({
        poId: selectedPoForGrn.id,
        supplierInvoiceNumber: grnInvoiceNumber,
        receivedItems: grnReceivedItems,
        user: currentUser
      });

      success('GRN Posted', `GRN ${grn.grnNumber} posted. Stock added to inventory ledger.`);
      setIsGrnModalOpen(false);
    } catch (err: any) {
      notifyError('GRN Posting Failed', err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-400" />
            Procurement & Supplier Inflow
          </h2>
          <p className="text-xs text-slate-400">
            Requisitions, Purchase Orders, Goods Received Notes (GRN), and automated stock injection
          </p>
        </div>

        {hasPermission('purchasing.create') && (
          <button
            onClick={handleOpenNewPo}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('PO')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeTab === 'PO' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Purchase Orders ({purchaseOrders.length})
          </span>
          {activeTab === 'PO' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('GRN')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeTab === 'GRN' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4" /> Goods Received Notes ({goodsReceivedNotes.length})
          </span>
          {activeTab === 'GRN' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeTab === 'SUPPLIERS' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Truck className="w-4 h-4" /> Supplier Directory ({suppliers.length})
          </span>
          {activeTab === 'SUPPLIERS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'PO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">PO Number & Date</th>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3">Items Count</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3">Delivery By</th>
                <th className="py-3 px-3 text-center">Approval Status</th>
                <th className="py-3 px-4 text-center">Receive GRN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {purchaseOrders.map(po => {
                const sup = suppliers.find((s: Supplier) => s.id === po.supplierId);
                const isApproved = po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED';

                return (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white font-mono text-xs">{po.poNumber}</div>
                      <div className="text-[10px] text-slate-400">{new Date(po.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="font-semibold text-slate-200">{sup ? sup.name : po.supplierId}</span>
                    </td>
                    <td className="py-3 px-3">{po.items.length} lines</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      Rs. {po.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{po.expectedDeliveryDate}</td>
                    <td className="py-3 px-3 text-center font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          po.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : po.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : po.status === 'COMPLETED'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {isApproved && po.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => handleOpenGrnForPo(po)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[11px] transition-colors shadow"
                        >
                          Receive (GRN)
                        </button>
                      ) : po.status === 'COMPLETED' ? (
                        <span className="text-[11px] text-slate-500 font-semibold">Fulfilled</span>
                      ) : (
                        <span className="text-[11px] text-amber-400">Awaiting Mgr Sign-off</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: GOODS RECEIVED NOTES (GRN) */}
      {activeTab === 'GRN' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">GRN # & Date</th>
                <th className="py-3 px-3">Linked PO #</th>
                <th className="py-3 px-3">Supplier Invoice</th>
                <th className="py-3 px-3 text-right">Received Total</th>
                <th className="py-3 px-3">Batches Allocated</th>
                <th className="py-3 px-4 text-center">Stock Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {goodsReceivedNotes.map(grn => (
                <tr key={grn.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-sans">
                    <div className="font-bold text-white font-mono text-xs">{grn.grnNumber}</div>
                    <div className="text-[10px] text-slate-400">{new Date(grn.receivedAt).toLocaleString()}</div>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-300">{grn.poNumber}</td>
                  <td className="py-3 px-3 text-slate-200">{grn.supplierInvoiceNumber}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-400">
                    Rs. {grn.totalValue.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-300">
                    {grn.items.map((i: any) => `${i.productName}: ${i.receivedQty} units (${i.batchNumber})`).join(', ')}
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                      <Check className="w-3 h-3 text-emerald-400" /> Stock Inflow Done
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: SUPPLIER DIRECTORY */}
      {activeTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((s: Supplier) => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{s.name}</h4>
                  <p className="text-[10px] font-mono text-emerald-400">{s.code}</p>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {s.paymentTermsDays} Days Terms
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-400">
                <p>Contact: <strong className="text-slate-200">{s.contactPerson}</strong></p>
                <p>Phone: <span className="font-mono text-slate-300">{s.phone}</span></p>
                <p>Email: <span className="text-slate-300">{s.email}</span></p>
                <p>VAT No: <span className="font-mono text-slate-300">{s.taxNumber}</span></p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Outstanding Balance</span>
                  <p className="font-mono font-bold text-amber-400">Rs. {s.currentBalance.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase">Credit Limit</span>
                  <p className="font-mono text-slate-300">Rs. {s.creditLimit.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create PO Modal */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl p-6 text-slate-100 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                Draft Purchase Order
              </h3>
              <button onClick={() => setIsPoModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Supplier *</label>
                  <select
                    value={poSupplierId}
                    onChange={e => setPoSupplierId(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={poExpectedDate}
                    onChange={e => setPoExpectedDate(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Purchase Items</label>
                  <button
                    type="button"
                    onClick={handleAddPoItemRow}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    + Add Line Item
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={e => {
                          const p = products.find(prod => prod.id === e.target.value);
                          const next = [...poItems];
                          next[idx] = {
                            ...next[idx],
                            productId: e.target.value,
                            unitCost: p ? p.costPrice : 100
                          };
                          setPoItems(next);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.orderedQty}
                        onChange={e => {
                          const next = [...poItems];
                          next[idx].orderedQty = parseFloat(e.target.value) || 1;
                          setPoItems(next);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-center font-mono text-white"
                      />
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={item.unitCost}
                        onChange={e => {
                          const next = [...poItems];
                          next[idx].unitCost = parseFloat(e.target.value) || 0;
                          setPoItems(next);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-right font-mono text-white"
                      />
                    </div>

                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                        className="text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">Total Purchase Value:</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  Rs. {poItems.reduce((acc, it) => acc + (it.orderedQty * it.unitCost), 0).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg"
                >
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive GRN Modal */}
      {isGrnModalOpen && selectedPoForGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl p-6 text-slate-100 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">Receive Goods Note (GRN)</h3>
                <p className="text-xs text-slate-400 font-mono">Linked PO: {selectedPoForGrn.poNumber}</p>
              </div>
              <button onClick={() => setIsGrnModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostGrn} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Supplier Commercial Invoice # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-MILCO-8980"
                  value={grnInvoiceNumber}
                  onChange={e => setGrnInvoiceNumber(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Item Inflow & Batch Allocation
                </label>

                {grnReceivedItems.map((item, idx) => {
                  const poItem = selectedPoForGrn.items.find(pi => pi.productId === item.productId);
                  return (
                    <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-white">{poItem?.productName}</span>
                        <span className="text-slate-400 font-mono">Ordered: {poItem?.orderedQty} {poItem?.unit}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400">Received Qty</label>
                          <input
                            type="number"
                            min="0"
                            value={item.receivedQty}
                            onChange={e => {
                              const next = [...grnReceivedItems];
                              next[idx].receivedQty = parseFloat(e.target.value) || 0;
                              setGrnReceivedItems(next);
                            }}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-emerald-400 font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400">Batch Code</label>
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={e => {
                              const next = [...grnReceivedItems];
                              next[idx].batchNumber = e.target.value;
                              setGrnReceivedItems(next);
                            }}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400">Expiry Date</label>
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={e => {
                              const next = [...grnReceivedItems];
                              next[idx].expiryDate = e.target.value;
                              setGrnReceivedItems(next);
                            }}
                            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg"
                >
                  Post GRN & Increment Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
