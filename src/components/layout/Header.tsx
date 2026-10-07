import React, { useState } from 'react';
import {
  Building2, Search, Monitor, Shield, ChevronDown, Download,
  Menu, X, Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { downloadProjectSourceZip } from '../../utils/downloader';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenPos: () => void;
  activeTab: string;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenPos,
  activeTab,
  isMobileMenuOpen,
  onToggleMobileMenu
}) => {
  const {
    currentUser,
    availableUsers,
    switchUser,
    activeBranch,
    availableBranches,
    switchBranch,
    activeTerminal
  } = useAuth();
  const { success, error: notifyError } = useNotification();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadSource = async () => {
    try {
      setIsDownloading(true);
      await downloadProjectSourceZip();
      success('Source Code Downloaded', 'Full project files bundled into .ZIP archive.');
    } catch (err: any) {
      notifyError('Download Failed', err.message || 'Could not bundle source code.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-6 shrink-0 z-30">
      {/* Left: Mobile Hamburger & Brand */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Hamburger Menu on Mobile */}
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 text-slate-400 hover:text-white md:hidden rounded-lg bg-slate-800/80"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-md shrink-0">
            A
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
              AuraRetail <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-800">ERP + POS</span>
            </h1>
            <p className="text-[10px] text-slate-400">Enterprise Supermarket Engine</p>
          </div>
        </div>

        {/* Branch Context Dropdown */}
        <div className="relative flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-lg px-2 py-1 text-xs max-w-[130px] sm:max-w-none">
          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden xs:inline" />
          <select
            value={activeBranch.id}
            onChange={e => switchBranch(e.target.value)}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-3 truncate text-[11px] sm:text-xs"
          >
            {availableBranches.map(b => (
              <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5" />
        </div>
      </div>

      {/* Middle / Right: Fast Actions, Download Source, POS Button */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 sm:px-3 sm:py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-xs text-slate-400 transition-colors flex items-center gap-2 group"
          title="Omni Search (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0" />
          <span className="hidden md:inline truncate max-w-[130px] lg:max-w-[200px]">Search SKUs, barcodes...</span>
          <kbd className="hidden lg:inline-block font-mono text-[10px] bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Download Source Code (.ZIP) Button */}
        <button
          onClick={handleDownloadSource}
          disabled={isDownloading}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm"
          title="Download Complete Source Code (.ZIP)"
        >
          {isDownloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          ) : (
            <Download className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="hidden sm:inline">Download Source</span>
          <span className="sm:hidden font-mono text-[11px]">.ZIP</span>
        </button>

        {/* POS Fast Launcher Button */}
        <button
          onClick={onOpenPos}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
            activeTab === 'pos'
              ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">POS LANE</span>
          <span className="sm:hidden">POS</span>
        </button>

        {/* User Role Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
          <Shield className="w-3 h-3 text-amber-400 shrink-0" />
          <select
            value={currentUser.id}
            onChange={e => switchUser(e.target.value)}
            className="bg-transparent text-slate-200 text-[11px] sm:text-xs font-semibold focus:outline-none cursor-pointer max-w-[90px] sm:max-w-[130px] truncate"
          >
            {availableUsers.map(u => (
              <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                {u.fullName.split(' ')[0]} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
