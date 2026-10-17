/**
 * LoginPage.jsx — Authentication Page (Login + Register)
 * 
 * Provides a polished login/register interface for both customers and managers.
 * Uses the AuthProvider for session management.
 */

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth.js';
import { LogIn, UserPlus, Mail, Lock, User, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp, error, clearError, loading } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'customer'
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    if (mode === 'login') {
      if (!formData.email || !formData.password) {
        setFormError('Please enter both email and password');
        setIsSubmitting(false);
        return;
      }
      const result = await signIn({ email: formData.email, password: formData.password });
      if (!result.success) {
        setFormError(result.error);
      }
    } else {
      if (!formData.full_name || !formData.email || !formData.password) {
        setFormError('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }
      if (formData.password.length < 6) {
        setFormError('Password must be at least 6 characters');
        setIsSubmitting(false);
        return;
      }
      const result = await signUp(formData);
      if (!result.success) {
        setFormError(result.error);
      }
    }
    setIsSubmitting(false);
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setFormError('');
    clearError();
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-600/5" />
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl backdrop-blur-sm">
              🌿
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Fynd</h1>
              <p className="text-emerald-400/80 text-sm font-medium">Perishable Stock Recovery Desk</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Reduce Food Waste.<br/>
            <span className="text-emerald-400">Save More.</span>
          </h2>
          
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Shop near-expiry products at great discounts. Help reduce food waste while saving money on quality groceries.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🏪', label: 'Fresh products from local stores' },
              { icon: '💰', label: 'Up to 50% off near-expiry items' },
              { icon: '🤝', label: 'Support food recovery initiatives' },
              { icon: '🛡️', label: 'All food safety rules enforced' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-slate-300 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Branding */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="text-3xl">🌿</span>
              <h1 className="text-2xl font-bold text-white">Fynd Recovery</h1>
            </div>
            <p className="text-slate-400 text-sm">Shop smart. Reduce waste.</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                {mode === 'login' 
                  ? 'Sign in to continue shopping' 
                  : 'Join us to start saving on groceries'}
              </p>
            </div>

            {/* Demo Credentials */}
            {mode === 'login' && (
              <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-300 text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Demo Credentials
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <button
                    type="button"
                    onClick={() => setFormData(d => ({ ...d, email: 'manager@fynd.com', password: 'manager123' }))}
                    className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="text-emerald-400 font-semibold block">Manager</span>
                    manager@fynd.com
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(d => ({ ...d, email: 'customer@example.com', password: 'customer123' }))}
                    className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="text-emerald-400 font-semibold block">Customer</span>
                    customer@example.com
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91-XXXXXXXXXX"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Account Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['customer', 'manager'].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setFormData(d => ({ ...d, role }))}
                          className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                            formData.role === role
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {role === 'customer' ? '🛒 Customer' : '📊 Manager'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {(formError || error) && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {formError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={switchMode}
                className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {mode === 'login'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
