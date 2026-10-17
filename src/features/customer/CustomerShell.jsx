/**
 * CustomerShell.jsx — Customer Dashboard Layout Shell
 * 
 * Provides navigation, cart icon, notification bell, and user menu
 * for the customer-facing experience.
 */

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
    <div className="min-h-screen bg-[#fafbfc] font-sans antialiased text-slate-800">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <button
                onClick={() => onNavigate('shop')}
                className="flex items-center gap-2.5"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <span className="text-lg">🌿</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-slate-900 leading-none">Fynd Fresh</h1>
                  <p className="text-[10px] text-slate-500 font-medium">Save More, Waste Less</p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
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
                className="lg:hidden relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-700">
                  {profile?.full_name || 'Customer'}
                </span>
                <button
                  onClick={signOut}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <nav className="lg:hidden bg-white border-t border-slate-100 p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
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
