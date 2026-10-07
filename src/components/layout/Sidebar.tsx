import React from 'react';
import {
  LayoutDashboard, Monitor, Package, Boxes, ShoppingBag,
  Receipt, Users, Tag, BarChart3, Settings, ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db/store';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'catalog'
  | 'inventory'
  | 'purchasing'
  | 'sales'
  | 'customers'
  | 'promotions'
  | 'reports'
  | 'admin';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  isMobileOpen,
  onCloseMobile
}) => {
  const { hasPermission } = useAuth();

  // Pending counts
  const pendingApprovalsCount = db.collection('approvals').find((a: any) => a.status === 'PENDING').length;
  const lowStockCount = db.collection('inventory').find((inv: any) => {
    const prod = db.collection('products').findById(inv.productId);
    return prod && inv.availableQty <= prod.reorderLevel;
  }).length;

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      allowed: true
    },
    {
      id: 'pos' as NavTab,
      label: 'Point of Sale (POS)',
      icon: Monitor,
      allowed: hasPermission('pos.access'),
      badge: 'Touch'
    },
    {
      id: 'catalog' as NavTab,
      label: 'Product Catalog',
      icon: Package,
      allowed: hasPermission('catalog.view')
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory Control',
      icon: Boxes,
      allowed: hasPermission('inventory.view'),
      badgeCount: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-amber-900/80 text-amber-300 border-amber-700/60'
    },
    {
      id: 'purchasing' as NavTab,
      label: 'Procurement & PO',
      icon: ShoppingBag,
      allowed: hasPermission('purchasing.view'),
      badgeCount: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-blue-900/80 text-blue-300 border-blue-700/60'
    },
    {
      id: 'sales' as NavTab,
      label: 'Sales & Invoices',
      icon: Receipt,
      allowed: hasPermission('sales.view')
    },
    {
      id: 'customers' as NavTab,
      label: 'Customers & Loyalty',
      icon: Users,
      allowed: hasPermission('customers.manage')
    },
    {
      id: 'promotions' as NavTab,
      label: 'Promotions Engine',
      icon: Tag,
      allowed: hasPermission('promotions.manage')
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Analytics',
      icon: BarChart3,
      allowed: hasPermission('reports.view')
    },
    {
      id: 'admin' as NavTab,
      label: 'Admin & Audit Logs',
      icon: Settings,
      allowed: hasPermission('admin.users') || hasPermission('admin.audit_logs')
    }
  ];

  const handleItemClick = (id: NavTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`bg-slate-900/98 border-r border-slate-800 transition-all duration-300 flex flex-col shrink-0 select-none z-50
          fixed md:static inset-y-0 left-0
          ${isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-16' : 'md:w-64'}
        `}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex md:hidden items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
              A
            </div>
            <span className="font-bold text-sm text-white">AuraRetail ERP</span>
          </div>
          <button onClick={onCloseMobile} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems
            .filter(item => item.allowed)
            .map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all relative group ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className={`truncate flex-1 text-left ${isCollapsed ? 'md:hidden' : ''}`}>
                    {item.label}
                  </span>

                  {/* Badge Count */}
                  {item.badgeCount !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${item.badgeColor} ${
                        isCollapsed ? 'md:hidden' : ''
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}

                  {/* Text Badge */}
                  {item.badge && (
                    <span
                      className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 ${
                        isCollapsed ? 'md:hidden' : ''
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight className={`w-3.5 h-3.5 text-emerald-400 shrink-0 ${isCollapsed ? 'md:hidden' : ''}`} />
                  )}
                </button>
              );
            })}
        </div>

        {/* System Status / Health Indicator */}
        <div className={`p-3 border-t border-slate-800 m-2 rounded-lg bg-slate-950/60 text-[11px] text-slate-400 ${isCollapsed ? 'md:hidden' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-300">Cluster Status</span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <p className="text-[10px] text-slate-500">ACID Ledger • MongoDB Ready</p>
        </div>
      </aside>
    </>
  );
};
