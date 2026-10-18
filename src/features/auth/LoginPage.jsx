/**
 * LoginPage.jsx — Authentication Page (Login + Register + Password Reset)
 * 
 * Provides a clean authentication interface for both customers and managers.
 * Integrates with Supabase Auth, supports password reset, and includes light/dark mode toggle.
 */

import React, { useState } from 'react';
import { useAuth } from '../../lib/auth.js';
import { ThemeToggle } from '../../components/ThemeToggle.jsx';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp, resetPassword, error, clearError } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot_password'
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'customer'
  });
  const [formError, setFormError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
    setInfoMessage('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setInfoMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!formData.email || !formData.password) {
          setFormError('Please enter both email and password.');
          setIsSubmitting(false);
          return;
        }
        const result = await signIn({ email: formData.email, password: formData.password });
        if (!result.success) {
          setFormError(result.error);
        }
      } else if (mode === 'register') {
        if (!formData.full_name || !formData.email || !formData.password) {
          setFormError('Please fill in all required fields.');
          setIsSubmitting(false);
          return;
        }
        if (formData.password.length < 6) {
          setFormError('Password must be at least 6 characters long.');
          setIsSubmitting(false);
          return;
        }
        const result = await signUp(formData);
        if (!result.success) {
          setFormError(result.error);
        } else if (result.requiresConfirmation) {
          setInfoMessage('Account created! A confirmation email has been sent. Please check your inbox or confirm in Supabase SQL Editor.');
        }
      } else if (mode === 'forgot_password') {
        if (!formData.email) {
          setFormError('Please enter your account email address.');
          setIsSubmitting(false);
          return;
        }
        const result = await resetPassword(formData.email);
        if (!result.success) {
          setFormError(result.error);
        } else {
          setInfoMessage(result.message || 'Password reset link sent! Check your inbox.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100 relative">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <ThemeToggle className="bg-white/10 hover:bg-white/20 text-white border-white/20" />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-600/5" />
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl backdrop-blur-sm shadow-xl">
              🌿
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Fynd Recovery</h1>
              <p className="text-emerald-400 text-sm font-medium">Perishable Stock Recovery & Food Safety</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            Intelligent Stock Recovery.<br/>
            <span className="text-emerald-400">Zero Food Waste.</span>
          </h2>
          
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Enforce strict cold-chain safety gates, simulate recovery markdowns, and sell near-expiry items directly to value-conscious shoppers while funding community food rescue.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🛡️', label: 'Strict Gate 1: Expired & damaged stock hard-blocked' },
              { icon: '📊', label: 'Dedicated Manager Decision & Analytics Desk' },
              { icon: '🛒', label: 'Protected Customer Shopping & Order Tracking' },
              { icon: '🤝', label: 'Integrated ₹1 Community Food Recovery contributions' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-slate-200 text-sm">{item.label}</span>
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
            <div className="inline-flex items-center gap-3 mb-2">
              <span className="text-3xl">🌿</span>
              <h1 className="text-2xl font-bold text-white">Fynd Recovery</h1>
            </div>
            <p className="text-slate-400 text-sm">Save More, Waste Less</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {mode === 'login' && 'Sign In to Your Account'}
                {mode === 'register' && 'Create Your Account'}
                {mode === 'forgot_password' && 'Reset Password'}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1.5">
                {mode === 'login' && 'Enter your credentials to access your dashboard'}
                {mode === 'register' && 'Sign up to access perishable food recovery'}
                {mode === 'forgot_password' && 'Enter your account email to receive a password reset link'}
              </p>
            </div>

            {/* Quick Test Account Fill Buttons */}
            {mode === 'login' && (
              <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-300 text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Development Test Accounts
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(d => ({
                        ...d,
                        email: 'manager@fynd.com',
                        password: 'Manager@Password123!'
                      }));
                      setFormError('');
                    }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-emerald-400 font-semibold block">Manager Desk</span>
                    manager@fynd.com
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(d => ({
                        ...d,
                        email: 'customer@fynd.com',
                        password: 'Customer@Password123!'
                      }));
                      setFormError('');
                    }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-left cursor-pointer"
                  >
                    <span className="text-emerald-400 font-semibold block">Customer Shop</span>
                    customer@fynd.com
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
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91-XXXXXXXXXX"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Account Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['customer', 'manager'].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setFormData(d => ({ ...d, role }))}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            formData.role === role
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
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
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">Password *</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setFormError('');
                          setInfoMessage('');
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {(formError || error) && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
                  {formError || error}
                </div>
              )}

              {/* Success Info Alert */}
              {infoMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' && <LogIn className="w-4 h-4" />}
                    {mode === 'register' && <UserPlus className="w-4 h-4" />}
                    {mode === 'forgot_password' && <KeyRound className="w-4 h-4" />}
                    {mode === 'login' && 'Sign In'}
                    {mode === 'register' && 'Create Account'}
                    {mode === 'forgot_password' && 'Send Reset Link'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {mode === 'forgot_password' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setFormError('');
                    setInfoMessage('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode(m => (m === 'login' ? 'register' : 'login'));
                    setFormError('');
                    setInfoMessage('');
                    clearError();
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {mode === 'login'
                    ? "Don't have an account? Create one"
                    : 'Already have an account? Sign in'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
