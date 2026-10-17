import React, { useState } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Calculator,
  CheckCircle,
  FileText,
  Search,
  Sun,
  ChevronDown,
  Box,
  Layers,
  Menu,
  X
} from 'lucide-react';

export function AppShell({
  currentPage,
  onNavigate,
  children,
  batchCount = 24,
  datasetMode = 'DEMO', // 'DEMO' | 'OFFICIAL'
  onToggleDataset,
  decisionCount = 0,
  searchQuery = '',
  onSearchChange
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    }
  ];

  const handleNavClick = (id, enabled) => {
    if (!enabled) return;
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-sans antialiased text-slate-800">
      {/* Dark Left Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0f172a] text-slate-300 flex-col shrink-0 border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
              <span className="text-lg">🌿</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">Fynd</h1>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Perishable Stock<br />Recovery Desk</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5" aria-label="Sidebar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.enabled)}
                disabled={!item.enabled}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1e293b] text-emerald-400 font-semibold shadow-inner'
                    : item.enabled
                    ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    : 'text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : item.enabled
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-800/80 text-slate-500 border border-slate-700/50'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Sidebar Box (From Mockup Image) */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
                <Box className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">FYND × NMIMS</p>
                <p className="text-[10px] font-semibold text-slate-400">C30</p>
                <p className="text-[10px] text-slate-500">Demo inventory</p>
              </div>
            </div>
            {onToggleDataset && (
              <button
                onClick={onToggleDataset}
                title="Toggle between 24-batch store demo and 2-batch official fixture"
                className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-md font-mono border border-slate-700 transition-colors"
              >
                {datasetMode === 'DEMO' ? '24 B' : '2 B'}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area with Top Header */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Mobile Menu Button & Brand */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-bold text-slate-900 text-base">Fynd Recovery</span>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search products, batches..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-sm placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Right Header Items (Theme icon, Dataset Switcher & User Profile) */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Dataset Pill Switcher */}
            {onToggleDataset && (
              <button
                onClick={onToggleDataset}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>{datasetMode === 'DEMO' ? 'Store Demo (24 Batches)' : 'Official Fixture (B1 & B2)'}</span>
              </button>
            )}

            {/* Sun / Theme Button */}
            <button
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Theme toggle"
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                DM
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-700">Demo Manager</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
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
