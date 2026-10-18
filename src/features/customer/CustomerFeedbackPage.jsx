/**
 * CustomerFeedbackPage.jsx — User Support & Issue Resolution Desk
 * 
 * Provides customers with direct access to store support:
 * - Displays official support phone numbers (+91 1800-419-3963 & +91 98765 43210).
 * - Pre-fills and displays customer email.
 * - Message box to report issues to the store manager.
 * - Live ticket history displaying store manager replies.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Headphones,
  Phone,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Store,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../lib/auth.js';
import { getFeedback, submitFeedback, getOrders } from '../../data/orderStore.js';

const ISSUE_CATEGORIES = [
  { value: 'product_quality', label: '🥬 Product Quality / Freshness' },
  { value: 'cold_chain', label: '❄️ Cold-Chain / Temperature Concern' },
  { value: 'damage', label: '📦 Damaged or Broken Package' },
  { value: 'pricing', label: '💰 Pricing or Discount Query' },
  { value: 'delivery', label: '🚚 Delivery & Timing' },
  { value: 'general', label: '💬 General Inquiry' }
];

export function CustomerFeedbackPage() {
  const { user, profile } = useAuth();
  const userEmail = user?.email || profile?.email || 'customer@fynd.com';
  const userName = profile?.full_name || 'Store Customer';
  const userPhone = profile?.phone || '+91 98765 43211';

  const [emailInput, setEmailInput] = useState(userEmail);
  const [phoneInput, setPhoneInput] = useState(userPhone);
  const [category, setCategory] = useState('product_quality');
  const [issueMessage, setIssueMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync email if user auth changes
  useEffect(() => {
    if (userEmail) setEmailInput(userEmail);
    if (userPhone) setPhoneInput(userPhone);
  }, [userEmail, userPhone]);

  // Load user's submitted support issues and live manager replies
  const myIssues = useMemo(() => {
    return getFeedback(f => 
      f.customerId === user?.id || 
      (f.customerEmail && f.customerEmail.toLowerCase() === userEmail.toLowerCase()) ||
      (!f.customerId && !f.customerEmail) // Fallback for local session
    );
  }, [user?.id, userEmail, submitted, refreshTrigger]);

  const myOrders = useMemo(() => {
    return getOrders(user?.id);
  }, [user?.id]);

  // Listen for storage changes across tabs (when manager replies in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'c30_orders_feedback') {
        setRefreshTrigger(prev => prev + 1);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!issueMessage.trim() || issueMessage.trim().length < 5) {
      setError('Please provide at least 5 characters describing the issue you are experiencing.');
      return;
    }

    try {
      submitFeedback({
        customerId: user?.id || 'customer-001',
        customerName: userName,
        customerEmail: emailInput.trim() || userEmail,
        customerPhone: phoneInput.trim() || userPhone,
        orderId: orderId || null,
        rating: 5,
        category,
        message: issueMessage.trim()
      });

      setSubmitted(true);
      setIssueMessage('');
      setCategory('product_quality');
      setOrderId('');
      setRefreshTrigger(prev => prev + 1);

      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(err.message || 'Failed to submit issue. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#D97757]/15 flex items-center justify-center text-[#D97757]">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#302722] tracking-tight">User Support</h1>
            <p className="text-xs text-[#76675F]">
              Direct helpdesk for perishable stock questions, delivery assistance, and product quality concerns.
            </p>
          </div>
        </div>
      </div>

      {/* Support Helpline & Registered Email Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Support Phone Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#EEDDD2] shadow-xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76675F]">Support Helpline (Toll-Free)</span>
            <p className="text-lg font-extrabold text-[#302722] mt-0.5">+91 1800-419-3963</p>
            <p className="text-[11px] text-[#76675F] mt-0.5">
              Direct Desk: <strong className="text-[#302722]">+91 98765 43210</strong> (8:00 AM – 10:00 PM IST)
            </p>
          </div>
        </div>

        {/* User Email Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#EEDDD2] shadow-xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#D97757]/10 text-[#D97757] flex items-center justify-center shrink-0 border border-[#D97757]/20">
            <Mail className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76675F]">Your Registered Email</span>
            <p className="text-sm font-bold text-[#302722] mt-0.5 truncate">{userEmail}</p>
            <p className="text-[11px] text-[#76675F] mt-0.5">
              The store manager will reply to your account and display responses below.
            </p>
          </div>
        </div>
      </div>

      {/* Issue Submission Box */}
      <div className="bg-white rounded-3xl border border-[#EEDDD2] p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#302722]">Report an Issue / Message Store Manager</h2>
          <p className="text-xs text-[#76675F] mt-1">
            Describe the issue you encountered. It will immediately reflect in the Store Manager's dashboard for review and reply.
          </p>
        </div>

        {submitted && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800">Support Request Submitted Successfully!</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your issue has been sent to the store manager. As soon as the manager encounters and replies to your ticket, the response will appear in the section below.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email and Phone Display/Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Your Email Address *</span>
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Contact Phone</span>
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91-9876543210"
                className="w-full px-3.5 py-2.5 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>
          </div>

          {/* Issue Category & Related Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722]">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              >
                {ISSUE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {myOrders.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#302722]">Related Order (Optional)</label>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                >
                  <option value="">No specific order</option>
                  {myOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.id} — ₹{o.total}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Issue Message Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#302722] flex items-center justify-between">
              <span>What's the issue? (Describe problem) *</span>
              <span className="text-[11px] font-normal text-[#76675F]">{issueMessage.length} characters</span>
            </label>
            <textarea
              required
              rows={4}
              value={issueMessage}
              onChange={(e) => setIssueMessage(e.target.value)}
              placeholder="Please explain the issue you are facing in detail. For example: 'Received dairy milk bottle with cold-chain seal broken', 'Delivery timing query', or 'Quality concern about product batch'..."
              className="w-full px-4 py-3 bg-[#FFF8F3] border border-[#EEDDD2] rounded-2xl text-xs sm:text-sm text-[#302722] placeholder:text-[#76675F] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-[#76675F]">
              Responses will reflect directly under <strong>Your Support Issues & Manager Replies</strong>.
            </p>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#302722] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Submit Issue to Manager</span>
            </button>
          </div>
        </form>
      </div>

      {/* Issues History & Manager Replies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#302722]">Your Support Issues & Manager Replies</h2>
          <span className="text-xs font-semibold text-[#76675F]">
            {myIssues.length} ticket{myIssues.length !== 1 ? 's' : ''}
          </span>
        </div>

        {myIssues.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EEDDD2] p-8 text-center text-[#76675F]">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-[#D97757]/60" />
            <p className="text-sm font-bold text-[#302722]">No support issues reported yet</p>
            <p className="text-xs mt-1">If you encounter any problem, submit it using the message box above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myIssues.map(issue => {
              const hasReply = Boolean(issue.managerResponse);

              return (
                <div
                  key={issue.id}
                  className="bg-white rounded-3xl border border-[#EEDDD2] p-6 shadow-xs space-y-4 transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEDDD2]/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#76675F] bg-[#FFF8F3] px-2.5 py-1 rounded-lg border border-[#EEDDD2]">
                        {issue.id}
                      </span>
                      <span className="text-xs text-[#76675F]">
                        {new Date(issue.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {issue.orderId && (
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Order: {issue.orderId}
                        </span>
                      )}
                    </div>

                    <div>
                      {hasReply ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Manager Responded</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending Store Manager Review</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer's Issue Description */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#76675F]">
                      Issue Reported:
                    </span>
                    <p className="text-sm font-medium text-[#302722] mt-1 bg-[#FFF8F3] p-4 rounded-2xl border border-[#EEDDD2]/70 leading-relaxed">
                      "{issue.message}"
                    </p>
                  </div>

                  {/* Store Manager Reply Box */}
                  {hasReply ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-[#302722] space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                            Store Manager Response
                          </span>
                        </div>
                        {issue.managerRespondedAt && (
                          <span className="text-[10px] text-emerald-800 font-semibold">
                            {new Date(issue.managerRespondedAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-emerald-950 leading-relaxed pl-8">
                        {issue.managerResponse}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs text-[#76675F]">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        The store manager has received your issue and will reply directly here.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
