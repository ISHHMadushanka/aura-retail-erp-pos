import React, { useState } from 'react';
import { Users, Plus, Award, Phone, Mail, Search, X, ShieldCheck } from 'lucide-react';
import { db } from '../../services/db/store';
import { Customer } from '../../types/erp';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AuditService } from '../../services/auditService';

export const CustomerLoyaltyView: React.FC = () => {
  const { currentUser, hasPermission, activeBranch } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    customerType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'CORPORATE',
    loyaltyCardNumber: '',
    creditLimit: 0
  });

  const customers = db.collection('customers').find();

  const filtered = customers.filter((c: Customer) => {
    return (
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.loyaltyCardNumber && c.loyaltyCardNumber.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      notifyError('Validation Failed', 'Customer Name and Mobile Phone are required.');
      return;
    }

    const newCustomer: Customer = {
      id: 'cust_' + Math.random().toString(36).substr(2, 9),
      companyId: currentUser.companyId,
      customerCode: 'CUST-' + Date.now().toString().slice(-4),
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      customerType: formData.customerType,
      creditLimit: formData.creditLimit,
      currentBalance: 0,
      loyaltyCardNumber: formData.loyaltyCardNumber || `LOYAL-${Date.now().toString().slice(-5)}`,
      loyaltyPoints: 100, // 100 sign-up bonus points!
      loyaltyTier: 'SILVER',
      totalSpent: 0,
      createdAt: new Date().toISOString()
    };

    db.collection('customers').insertOne(newCustomer);
    AuditService.log(
      currentUser,
      'CUSTOMER_ENROLLED',
      'CUSTOMERS',
      newCustomer.id,
      null,
      newCustomer,
      activeBranch.id
    );

    success('Customer Enrolled', `${newCustomer.fullName} registered with 100 bonus loyalty points.`);
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Customers & Retail Loyalty Program
          </h2>
          <p className="text-xs text-slate-400">
            Customer directory, loyalty points accrual rules, tier upgrades (Silver/Gold/Platinum), and credit limits
          </p>
        </div>

        {hasPermission('customers.manage') && (
          <button
            onClick={() => {
              setFormData({
                fullName: '',
                phone: '',
                email: '',
                customerType: 'INDIVIDUAL',
                loyaltyCardNumber: `LOYAL-${Date.now().toString().slice(-5)}`,
                creditLimit: 0
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors shadow-lg self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Enrol New Customer</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 max-w-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by customer name, phone number, or card #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((c: Customer) => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">{c.fullName}</h4>
                <p className="text-[10px] font-mono text-purple-400">{c.customerCode}</p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  c.loyaltyTier === 'PLATINUM'
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : c.loyaltyTier === 'GOLD'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {c.loyaltyTier} MEMBER
              </span>
            </div>

            <div className="text-xs space-y-1 text-slate-400">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono text-slate-200">{c.phone}</span>
              </p>
              {c.email && (
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{c.email}</span>
                </p>
              )}
              <p className="text-[11px] font-mono text-slate-400">
                Card: {c.loyaltyCardNumber || 'Virtual Card'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Loyalty Rewards</span>
                <p className="font-mono font-bold text-purple-400 text-sm">{c.loyaltyPoints} Points</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Lifetime Spend</span>
                <p className="font-mono font-bold text-emerald-400">Rs. {c.totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enrol Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl p-6 text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Enrol Loyalty Customer
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Mobile Phone Number (POS Lookup) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0771234567"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Loyalty Card Barcode / Number</label>
                <input
                  type="text"
                  value={formData.loyaltyCardNumber}
                  onChange={e => setFormData({ ...formData, loyaltyCardNumber: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white"
                />
              </div>

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
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs shadow-lg"
                >
                  Enrol Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
