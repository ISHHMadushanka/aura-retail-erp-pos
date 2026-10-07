import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { ExecutiveDashboardView } from './features/dashboard/ExecutiveDashboardView';
import { PosTerminalView } from './features/pos/PosTerminalView';
import { ProductCatalogView } from './features/catalog/ProductCatalogView';
import { InventoryControlView } from './features/inventory/InventoryControlView';
import { PurchasingView } from './features/purchasing/PurchasingView';
import { SalesHistoryView } from './features/sales/SalesHistoryView';
import { CustomerLoyaltyView } from './features/customers/CustomerLoyaltyView';
import { PromotionsView } from './features/promotions/PromotionsView';
import { ReportsView } from './features/reports/ReportsView';
import { AdminView } from './features/admin/AdminView';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleGlobalSearchSelect = (type: string, id: string) => {
    if (type === 'PRODUCT') setActiveTab('catalog');
    else if (type === 'CUSTOMER') setActiveTab('customers');
    else if (type === 'SUPPLIER') setActiveTab('purchasing');
    else if (type === 'SALE') setActiveTab('sales');
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top ERP Header */}
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenPos={() => setActiveTab('pos')}
          activeTab={activeTab}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Dynamic Workspace Canvas */}
        <main className="flex-1 overflow-y-auto bg-slate-950 flex flex-col">
          {activeTab === 'dashboard' && <ExecutiveDashboardView onNavigate={setActiveTab} />}
          {activeTab === 'pos' && <PosTerminalView />}
          {activeTab === 'catalog' && <ProductCatalogView />}
          {activeTab === 'inventory' && <InventoryControlView />}
          {activeTab === 'purchasing' && <PurchasingView />}
          {activeTab === 'sales' && <SalesHistoryView />}
          {activeTab === 'customers' && <CustomerLoyaltyView />}
          {activeTab === 'promotions' && <PromotionsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'admin' && <AdminView />}
        </main>
      </div>

      {/* Global Omni Search Modal (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAction={handleGlobalSearchSelect}
      />
    </div>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}
