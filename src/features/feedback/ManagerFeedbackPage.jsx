/**
 * ManagerFeedbackPage.jsx — Store Manager Feedback & Customer Experience Dashboard
 * 
 * Allows store managers to review customer ratings, inspect feedback categorized
 * by operational concern, and draft official manager responses.
 */

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Star,
  CheckCircle,
  Reply,
  Filter,
  Send,
  User,
  Clock,
  Sparkles
} from 'lucide-react';
import { getFeedback, respondToFeedback } from '../../data/orderStore.js';

export function ManagerFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState(() => getFeedback());
  const [filterCategory, setFilterCategory] = useState('all');
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const refreshFeedback = () => {
    setFeedbackList(getFeedback());
  };

  const handleSendReply = (id) => {
    if (!replyText.trim()) return;
    respondToFeedback(id, replyText.trim());
    setReplyingId(null);
    setReplyText('');
    refreshFeedback();
  };

  const filtered = useMemo(() => {
    return feedbackList.filter((item) => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    });
  }, [feedbackList, filterCategory, statusFilter]);

  // Aggregate stats
  const totalReviews = feedbackList.length;
  const avgRating = totalReviews > 0
    ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalReviews).toFixed(1)
    : '0.0';

  const categoryCounts = useMemo(() => {
    const counts = {};
    feedbackList.forEach((f) => {
      counts[f.category] = (counts[f.category] || 0) + 1;
    });
    return counts;
  }, [feedbackList]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Support & Feedback Tickets</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review customer inquiries, issues, and quality reports. Respond directly to reflect in the user's support dashboard.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Rating</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{avgRating}</span>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-amber-400' : 'text-slate-200'}`}
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Based on {totalReviews} customer submission{totalReviews !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Feedback Items</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{totalReviews}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {feedbackList.filter(f => f.status === 'reviewed').length} responded
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Response</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-2">
            {feedbackList.filter(f => f.status === 'submitted').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting manager reply</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'general', 'product_quality', 'pricing', 'delivery', 'app_experience'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Needs Response</option>
            <option value="reviewed">Responded</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No customer feedback matching criteria</p>
          <p className="text-xs text-slate-400 mt-1">Customer reviews submitted via the shopper interface appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                    {item.customerName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-900">{item.customerName || 'Anonymous Customer'}</p>
                      {item.customerEmail && (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✉️ {item.customerEmail}
                        </span>
                      )}
                      {item.customerPhone && (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          📞 {item.customerPhone}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {item.orderId && ` • Order ${item.orderId}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.status === 'reviewed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {item.status === 'reviewed' ? 'Responded' : 'Needs Response'}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Issue Reported:
                </span>
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-1">
                  "{item.message}"
                </p>
              </div>

              {/* Existing Manager Reply */}
              {item.managerResponse && (
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Store Manager Response:
                    </p>
                    {item.managerRespondedAt && (
                      <span className="text-[10px] text-emerald-700">
                        {new Date(item.managerRespondedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 font-medium pl-4">{item.managerResponse}</p>
                </div>
              )}

              {/* Reply Form */}
              {replyingId === item.id ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write an official response to this customer. It will immediately reflect in their User Support section..."
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setReplyingId(null)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSendReply(item.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Response to Customer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setReplyingId(item.id);
                      setReplyText(item.managerResponse || '');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>{item.managerResponse ? 'Update Response' : 'Reply to Customer'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManagerFeedbackPage;
