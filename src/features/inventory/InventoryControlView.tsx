import React, { useState } from 'react';
import {
  Boxes, ArrowLeftRight, Wrench, AlertTriangle, Search,
  Calendar, Check, X, History, Layers, PlusCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { db } from '../../services/db/store';
import { InventoryRecord, InventoryTransaction, Product, Warehouse } from '../../types/erp';
import { InventoryService } from '../../services/inventoryService';

export const InventoryControlView: React.FC = () => {
  const { activeBranch, currentUser, hasPermission } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [activeSubTab, setActiveSubTab] = useState<'STOCK' | 'LEDGER'>('STOCK');
  const [search, setSearch] = useState('');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  // Transfer form state
  const [transferData, setTransferData] = useState({
    productId: '',
    sourceWarehouseId: '',
    destWarehouseId: '',
    quantity: 1,
    notes: ''
  });

  // Adjustment form state
  const [adjustData, setAdjustData] = useState({
    productId: '',
    warehouseId: '',
    newQuantity: 0,
    reason: 'CYCLE_COUNT' as const,
    notes: ''
  });

  const branchInventory = InventoryService.getBranchInventory(activeBranch.id);
  const warehouses = db.collection('warehouses').find();
  const branchWarehouses = warehouses.filter((w: Warehouse) => w.branchId === activeBranch.id);
  const products = db.collection('products').find();
  const ledgerTransactions = db.collection('inventoryTransactions').find(
    (tx: InventoryTransaction) => tx.branchId === activeBranch.id
  ).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredInventory = branchInventory.filter(item => {
    return (
      item.product.name.toLowerCase().includes(search.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.product.barcode.includes(search)
    );
  });

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.productId || !transferData.sourceWarehouseId || !transferData.destWarehouseId) {
      notifyError('Validation Failed', 'Select product and source/destination warehouses.');
      return;
    }
    if (transferData.sourceWarehouseId === transferData.destWarehouseId) {
      notifyError('Invalid Route', 'Source and destination warehouses cannot be the same.');
      return;
    }

    try {
      const destWh = warehouses.find((w: Warehouse) => w.id === transferData.destWarehouseId);
      InventoryService.transferStock(
        transferData.sourceWarehouseId,
        activeBranch.id,
        transferData.destWarehouseId,
        destWh ? destWh.branchId : activeBranch.id,
        transferData.productId,
        transferData.quantity,
        currentUser,
        transferData.notes
      );
      success('Transfer Completed', `Dispatched ${transferData.quantity} units to ${destWh?.name || 'warehouse'}`);
      setIsTransferOpen(false);
    } catch (err: any) {
      notifyError('Transfer Failed', err.message);
    }
  };

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustData.productId || !adjustData.warehouseId) {
      notifyError('Validation Failed', 'Select product and warehouse.');
      return;
    }

    try {
      InventoryService.adjustStock(
        activeBranch.id,
        adjustData.warehouseId,
        adjustData.productId,
        adjustData.newQuantity,
        adjustData.reason,
        currentUser,
        adjustData.notes
      );
      success('Stock Adjusted', 'Ledger balance updated successfully.');
      setIsAdjustOpen(false);
    } catch (err: any) {
      notifyError('Adjustment Failed', err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-400" />
            Inventory Ledger & Warehouse Stock
          </h2>
          <p className="text-xs text-slate-400">
            Double-entry stock movement tracking, batch expiry allocation, and inter-branch transfers
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('inventory.transfer') && (
            <button
              onClick={() => {
                setTransferData({
                  productId: products[0]?.id || '',
                  sourceWarehouseId: branchWarehouses[0]?.id || '',
                  destWarehouseId: warehouses.find(w => w.id !== branchWarehouses[0]?.id)?.id || '',
                  quantity: 5,
                  notes: ''
                });
                setIsTransferOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4 text-blue-400" />
              <span>Stock Transfer</span>
            </button>
          )}

          {hasPermission('inventory.adjust') && (
            <button
              onClick={() => {
                setAdjustData({
                  productId: products[0]?.id || '',
                  warehouseId: branchWarehouses[0]?.id || '',
                  newQuantity: 10,
                  reason: 'CYCLE_COUNT',
                  notes: ''
                });
                setIsAdjustOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow"
            >
              <Wrench className="w-4 h-4" />
              <span>Adjust / Wastage</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtab Navigation (Stock on Hand vs Ledger History) */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveSubTab('STOCK')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'STOCK' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4" /> Stock on Hand ({filteredInventory.length})
          </span>
          {activeSubTab === 'STOCK' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('LEDGER')}
          className={`pb-2.5 text-xs font-bold transition-all relative ${
            activeSubTab === 'LEDGER' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <History className="w-4 h-4" /> Immutable Double-Entry Ledger ({ledgerTransactions.length})
          </span>
          {activeSubTab === 'LEDGER' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>
      </div>

      {/* VIEW 1: STOCK ON HAND */}
      {activeSubTab === 'STOCK' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 max-w-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search stock by SKU, product name, or barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-3">Warehouse / Floor</th>
                  <th className="py-3 px-3 text-right">Physical On Hand</th>
                  <th className="py-3 px-3 text-right">Reserved Qty</th>
                  <th className="py-3 px-3 text-right">Available Qty</th>
                  <th className="py-3 px-3 text-center">Reorder Threshold</th>
                  <th className="py-3 px-3">Active Batches & Expiry</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filteredInventory.map(item => {
                  const wh = warehouses.find((w: Warehouse) => w.id === item.warehouseId);
                  const isLow = item.availableQty <= item.product.reorderLevel;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-white text-xs">{item.product.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.product.sku} • {item.product.barcode}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className="text-slate-300">{wh ? wh.name : item.warehouseId}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {item.onHandQty} {item.product.unit}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {item.reservedQty} {item.product.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {item.availableQty} {item.product.unit}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">
                        {item.product.reorderLevel}
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        {item.batches && item.batches.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.batches.map((b, idx) => (
                              <div key={idx} className="text-slate-300">
                                <span className="font-semibold text-emerald-400">{b.batchNumber}</span> (Exp: {b.expiryDate || 'N/A'})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">Non-batch item</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            <Check className="w-3 h-3 text-emerald-400" /> Optimal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: IMMUTABLE DOUBLE-ENTRY LEDGER */}
      {activeSubTab === 'LEDGER' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Transaction Type</th>
                <th className="py-3 px-3">Reference #</th>
                <th className="py-3 px-3">Product SKU</th>
                <th className="py-3 px-3 text-right">Qty Change</th>
                <th className="py-3 px-3 text-right">Resulting Balance</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {ledgerTransactions.map(tx => {
                const prod = products.find((p: Product) => p.id === tx.productId);
                const isInflow = tx.quantityChange > 0;

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isInflow
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-200">
                      {tx.referenceId}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="font-bold text-white font-mono">{prod?.sku || 'SKU'}</span>
                      <div className="text-[10px] text-slate-400">{prod?.name}</div>
                    </td>
                    <td className={`py-3 px-3 text-right font-black ${isInflow ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isInflow ? '+' : ''}{tx.quantityChange}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      {tx.resultingOnHandQty}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      Rs. {tx.unitCost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-400 text-[11px] max-w-xs truncate">
                      {tx.notes || 'Routine stock ledger movement'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                Inter-Warehouse Stock Transfer
              </h3>
              <button onClick={() => setIsTransferOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Product SKU *</label>
                <select
                  value={transferData.productId}
                  onChange={e => setTransferData({ ...transferData, productId: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Source Warehouse</label>
                  <select
                    value={transferData.sourceWarehouseId}
                    onChange={e => setTransferData({ ...transferData, sourceWarehouseId: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Destination Warehouse</label>
                  <select
                    value={transferData.destWarehouseId}
                    onChange={e => setTransferData({ ...transferData, destWarehouseId: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Quantity to Transfer</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={transferData.quantity}
                  onChange={e => setTransferData({ ...transferData, quantity: parseFloat(e.target.value) || 1 })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Dispatch Notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Stock replenishment for cold room"
                  value={transferData.notes}
                  onChange={e => setTransferData({ ...transferData, notes: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Physical Stock Adjustment / Wastage
              </h3>
              <button onClick={() => setIsAdjustOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Product *</label>
                <select
                  value={adjustData.productId}
                  onChange={e => setAdjustData({ ...adjustData, productId: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Warehouse Location</label>
                <select
                  value={adjustData.warehouseId}
                  onChange={e => setAdjustData({ ...adjustData, warehouseId: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  {branchWarehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">New Physical Verified Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={adjustData.newQuantity}
                  onChange={e => setAdjustData({ ...adjustData, newQuantity: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Adjustment Reason</label>
                <select
                  value={adjustData.reason}
                  onChange={e => setAdjustData({ ...adjustData, reason: e.target.value as any })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="CYCLE_COUNT">Routine Cycle Count Correction</option>
                  <option value="DAMAGE_WASTAGE">Damaged Produce / Wastage</option>
                  <option value="EXPIRY">Expired Product Write-off</option>
                  <option value="THEFT">Shrinkage / Theft Investigation</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Audit Notes</label>
                <input
                  type="text"
                  placeholder="Supervisor sign-off notes"
                  value={adjustData.notes}
                  onChange={e => setAdjustData({ ...adjustData, notes: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
