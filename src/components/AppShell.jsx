import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Calculator,
  CheckCircle,
  FileText,
  Search,
  ChevronDown,
  Box,
  Layers,
  Menu,
  X,
  Bell,
  MessageSquare,
  LogOut,
  TrendingUp,
  Database,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../lib/auth.js';

export function AppShell({
  currentPage,
  onNavigate,
  children,
  batchCount = 0,
  datasetMode = 'DEMO', // 'DEMO' | 'OFFICIAL'
  onToggleDataset,
  decisionCount = 0,
  searchQuery = '',
  onSearchChange,
  unreadNotificationsCount = 0,
  onSignOut
}) {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('fynd_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fynd_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      enabled: true
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Boxes,
      enabled: true,
      badge: batchCount > 0 ? `${batchCount}` : null
    },
    {
      id: 'simulator',
      label: 'Simulator',
      icon: Calculator,
      enabled: true
    },
    {
      id: 'decisions',
      label: 'Decisions',
      icon: CheckCircle,
      enabled: true,
      badge: decisionCount > 0 ? `${decisionCount}` : null
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      enabled: true,
      badge: '25 pts'
    },
    {
      id: 'predict',
      label: 'Predict',
      icon: Sparkles,
      enabled: true,
      badge: 'AI'
    },
    {
      id: 'insights',
      label: 'Business Insights',
      icon: TrendingUp,
      enabled: true
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      enabled: true,
      badge: unreadNotificationsCount > 0 ? `${unreadNotificationsCount}` : null
    },
    {
      id: 'feedback',
      label: 'User Support & Feedback',
      icon: MessageSquare,
      enabled: true
    }
  ];

  const handleNavClick = (id, enabled) => {
    if (!enabled) return;
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#FFF1E8] font-sans antialiased text-[#302722]">
      {/* Dark Left Sidebar with Expand / Collapse */}
      <aside
        className={`hidden lg:flex ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#0f172a] text-slate-300 flex-col shrink-0 border-r border-slate-800 select-none transition-all duration-300 ease-in-out`}
      >
        {/* Brand Header */}
        <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-800/60">
          <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`} title="DE - FYND — Perishable Stock Recovery Desk">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20 shrink-0">
              <span className="text-xl">🌿</span>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">DE - FYND</h1>
                <p className="text-[11px] text-slate-400 font-medium mt-1 leading-tight">
                  Perishable Stock<br />Recovery Desk
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button when sidebar is collapsed */}
        {isCollapsed && (
          <div className="pt-2 px-3 flex justify-center">
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Sidebar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.enabled)}
                disabled={!item.enabled}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-[#1e293b] text-emerald-400 font-semibold shadow-inner'
                    : item.enabled
                    ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                    }`}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : item.enabled
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-800/80 text-slate-500 border border-slate-700/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed dot badge indicator */}
                {isCollapsed && item.badge && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Sidebar Box */}
        <div className="p-3 border-t border-slate-800/80">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div
                className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-emerald-400"
                title="DE - FYND × NMIMS C30"
              >
                <Box className="w-4 h-4" />
              </div>
              {onToggleDataset && (
                <button
                  onClick={onToggleDataset}
                  title="Toggle between Live Database and Official Fixture"
                  className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-emerald-400 rounded border border-slate-700 cursor-pointer"
                >
                  {datasetMode === 'OFFICIAL' ? 'Fix' : 'Live'}
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
                  <Box className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-tight">DE - FYND × NMIMS</p>
                  <p className="text-[10px] font-semibold text-slate-400">C30</p>
                  <p className="text-[10px] text-slate-500">{datasetMode === 'OFFICIAL' ? 'Official Fixture' : 'Live Database'}</p>
                </div>
              </div>
              {onToggleDataset && (
                <button
                  onClick={onToggleDataset}
                  title="Toggle between Live Database and Official Fixture"
                  className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md font-mono border border-slate-700 transition-colors cursor-pointer"
                >
                  {datasetMode === 'OFFICIAL' ? 'Fixture' : 'Live'}
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area with Top Header */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FFF1E8]">
        {/* Top Navbar */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#EEDDD2] px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
          {/* Mobile Menu Button & Brand */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#76675F] hover:bg-[#FFF8F3] rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-bold text-[#302722] text-base">DE - FYND Recovery</span>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#76675F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && onSearchChange) onSearchChange('');
              }}
              placeholder="Search products, batches..."
              aria-label="Search products and batches"
              autoComplete="off"
              className="w-full pl-10 pr-9 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-sm text-[#302722] placeholder:text-[#76675F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange && onSearchChange('')}
                title="Clear search"
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#76675F] hover:text-[#302722] hover:bg-white rounded-md cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Header Items (Dataset Switcher & User Profile) */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Dataset Pill Switcher */}
            {onToggleDataset && (
              <button
                onClick={onToggleDataset}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#FFF8F3] hover:bg-[#FFE8DC] text-[#302722] transition-colors border border-[#EEDDD2]"
              >
                <Layers className="w-3.5 h-3.5 text-[#D97757]" />
                <span>{datasetMode === 'DEMO' ? 'Store Inventory' : 'Official Fixture (B1 & B2)'}</span>
              </button>
            )}

            {/* Cloud Sync Status */}
            <div
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF8F3] text-emerald-800 border border-emerald-300"
              title="Cloud Database Synced"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#EEDDD2]">
              <div className="w-8 h-8 rounded-full bg-[#302722] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'M'}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-[#302722]">
                {profile?.full_name || 'Store Manager'}
              </span>
              <button
                onClick={onSignOut || signOut}
                title="Sign out"
                className="p-1.5 text-[#76675F] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden bg-[#0f172a] text-slate-200 p-4 space-y-1 border-b border-slate-800" aria-label="Mobile Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id, item.enabled)}
                  disabled={!item.enabled}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 font-bold'
                      : item.enabled
                      ? 'text-slate-300'
                      : 'text-slate-600 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Main Page Workspace */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

