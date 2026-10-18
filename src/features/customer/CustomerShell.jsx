import React, { useState } from 'react';
import {
  Home, ShoppingBag, ShoppingCart, Bell, MessageSquare,
  ClipboardList, User, LogOut, Search, Menu, X, Heart
} from 'lucide-react';
import { useAuth } from '../../lib/auth.js';
import { useCart } from '../../lib/cartContext.js';
import { useNotifications } from '../../lib/notificationContext.js';

export function CustomerShell({ currentPage, onNavigate, children }) {
  const { profile, signOut } = useAuth();
  const { itemCount } = useCart();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'shop', label: 'Shop', icon: Home },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: itemCount > 0 ? itemCount : null },
    { id: 'orders', label: 'My Orders', icon: ClipboardList },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#FFF1E8] font-sans antialiased text-[#302722]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EEDDD2] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-[#76675F] hover:bg-[#FFF8F3] rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button
                onClick={() => onNavigate('shop')}
                className="flex items-center gap-2.5 cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <span className="text-lg">🌿</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-[#302722] leading-none">Fynd Fresh</h1>
                  <p className="text-[10px] text-[#76675F] font-medium mt-0.5">Save More, Waste Less</p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#D97757]/10 text-[#D97757] font-semibold'
                        : 'text-[#76675F] hover:bg-[#FFF8F3] hover:text-[#302722]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-[#D97757] text-white text-[10px] font-bold rounded-full ml-1">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Cart Quick Access (Mobile) */}
              <button
                onClick={() => onNavigate('cart')}
                className="lg:hidden relative p-2 text-[#76675F] hover:bg-[#FFF8F3] rounded-lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 bg-[#D97757] text-white text-[9px] font-bold rounded-full">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-2 pl-3 border-l border-[#EEDDD2]">
                <div className="w-8 h-8 rounded-full bg-[#D97757]/15 text-[#D97757] font-bold text-xs flex items-center justify-center shadow-xs">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-[#302722]">
                  {profile?.full_name || 'Customer'}
                </span>
                <button
                  onClick={signOut}
                  className="p-1.5 text-[#76675F] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <nav className="lg:hidden bg-white border-t border-[#EEDDD2] p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-[#D97757]/10 text-[#D97757] font-bold'
                      : 'text-[#76675F] hover:bg-[#FFF8F3]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D97757] text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

