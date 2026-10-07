import React, { useState } from 'react';
import { Tag, Plus, Calendar, Check, X, Sparkles, Percent, ShoppingBag } from 'lucide-react';
import { db } from '../../services/db/store';
import { Promotion, Product } from '../../types/erp';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AuditService } from '../../services/auditService';

export const PromotionsView: React.FC = () => {
  const { currentUser, hasPermission, activeBranch } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Promotion>>({
    name: '',
    code: '',
    description: '',
    type: 'BUY_X_GET_Y',
    targetType: 'SPECIFIC_PRODUCT',
    targetId: '',
    discountValue: 0,
    buyQuantity: 2,
    getQuantity: 1,
    minBasketValue: 5000,
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    priority: 1,
    isActive: true
  });

  const promotions = db.collection('promotions').find();
  const products = db.collection('products').find();

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      notifyError('Validation Failed', 'Promotion Name and Promo Code are required.');
      return;
    }

    const newPromo: Promotion = {
      id: 'promo_' + Math.random().toString(36).substr(2, 9),
      code: formData.code.toUpperCase(),
      name: formData.name,
      description: formData.description || '',
      type: formData.type as any,
      targetType: formData.targetType as any,
      targetId: formData.targetId,
      discountValue: Number(formData.discountValue) || 0,
      buyQuantity: formData.type === 'BUY_X_GET_Y' ? Number(formData.buyQuantity) || 2 : undefined,
      getQuantity: formData.type === 'BUY_X_GET_Y' ? Number(formData.getQuantity) || 1 : undefined,
      minBasketValue: formData.targetType === 'MIN_BASKET_TOTAL' ? Number(formData.minBasketValue) || 5000 : undefined,
      startDate: formData.startDate || '2026-10-01',
      endDate: formData.endDate || '2026-12-31',
      isActive: true,
      priority: Number(formData.priority) || 1
    };

    db.collection('promotions').insertOne(newPromo);
    AuditService.log(
      currentUser,
      'PROMOTION_CREATED',
      'PROMOTIONS',
      newPromo.id,
      null,
      newPromo,
      activeBranch.id
    );

    success('Promotion Published', `${newPromo.name} is now active across POS lanes.`);
    setIsModalOpen(false);
  };

  const handleTogglePromo = (promo: Promotion) => {
    const updated = !promo.isActive;
    db.collection('promotions').updateOne(
      (p: Promotion) => p.id === promo.id,
      { isActive: updated }
    );
    success('Promotion Updated', `${promo.name} ${updated ? 'activated' : 'paused'}.`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-400" />
            Promotions & Retail Discount Engine
          </h2>
          <p className="text-xs text-slate-400">
            Configure Buy X Get Y deals, basket thresholds, category markdowns, and time-based sales
          </p>
        </div>

        {hasPermission('promotions.manage') && (
          <button
            onClick={() => {
              setFormData({
                name: '',
                code: 'DEAL-' + Date.now().toString().slice(-4),
                description: '',
                type: 'BUY_X_GET_Y',
                targetType: 'SPECIFIC_PRODUCT',
                targetId: products[0]?.id || '',
                discountValue: 0,
                buyQuantity: 2,
                getQuantity: 1,
                minBasketValue: 5000,
                startDate: '2026-10-01',
                endDate: '2026-11-30',
                priority: 1,
                isActive: true
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-lg self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Promotion Campaign</span>
          </button>
        )}
      </div>

      {/* Promotion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((p: Promotion) => {
          const targetProd = products.find((pr: Product) => pr.id === p.targetId);

          return (
            <div
              key={p.id}
              className={`bg-slate-900 border rounded-xl p-5 space-y-3 transition-colors ${
                p.isActive ? 'border-emerald-700/60 shadow-md' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">{p.code}</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300 font-semibold">
                      {p.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white mt-1">{p.name}</h3>
                </div>
                <button
                  onClick={() => handleTogglePromo(p)}
                  className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                    p.isActive
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-800'
                  }`}
                >
                  {p.isActive ? 'Active' : 'Paused'}
                </button>
              </div>

              <p className="text-xs text-slate-300">{p.description}</p>

              {p.type === 'BUY_X_GET_Y' && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span>Rule: Buy <strong>{p.buyQuantity}</strong> Get <strong>{p.getQuantity}</strong> FREE</span>
                  {targetProd && <span className="text-emerald-400 font-mono font-semibold">{targetProd.name}</span>}
                </div>
              )}

              {p.targetType === 'MIN_BASKET_TOTAL' && (
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span>Spend Over <strong>Rs. {p.minBasketValue?.toLocaleString()}</strong></span>
                  <span className="text-emerald-400 font-bold font-mono">{p.discountValue}% OFF Total Bill</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {p.startDate} to {p.endDate}
                </span>
                <span>Priority: {p.priority}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Promotion Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                Configure Promotion Campaign
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Promo Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono uppercase text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Promo Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="BUY_X_GET_Y">Buy X Get Y Free</option>
                    <option value="PERCENTAGE_DISCOUNT">Percentage Markdown</option>
                    <option value="FIXED_AMOUNT">Fixed Rupee Discount</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Dairy Bonanza"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Customer Description</label>
                <input
                  type="text"
                  placeholder="Appears on receipt and promotional shelf-talkers"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              {formData.type === 'BUY_X_GET_Y' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Target Product</label>
                    <select
                      value={formData.targetId}
                      onChange={e => setFormData({ ...formData, targetId: e.target.value, targetType: 'SPECIFIC_PRODUCT' })}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Buy Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.buyQuantity}
                      onChange={e => setFormData({ ...formData, buyQuantity: parseInt(e.target.value) || 2 })}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Get Free Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.getQuantity}
                      onChange={e => setFormData({ ...formData, getQuantity: parseInt(e.target.value) || 1 })}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-emerald-400 font-bold text-center"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Discount Value (%)</label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={e => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Min Cart Total (Rs.)</label>
                    <input
                      type="number"
                      value={formData.minBasketValue}
                      onChange={e => setFormData({ ...formData, minBasketValue: parseFloat(e.target.value) || 0, targetType: 'MIN_BASKET_TOTAL' })}
                      className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs shadow-lg"
                >
                  Publish Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
