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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Feedback & Reviews</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review buyer experiences, track food satisfaction ratings, and maintain customer trust.
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
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                    {item.customerName?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{item.customerName || 'Anonymous Customer'}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {item.orderId && ` • Order ${item.orderId}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= item.rating ? 'fill-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.status === 'reviewed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status === 'reviewed' ? 'Responded' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Message */}
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                "{item.message}"
              </p>

              {/* Existing Manager Reply */}
              {item.managerResponse && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Store Manager Response:
                  </p>
                  <p className="text-slate-700">{item.managerResponse}</p>
                </div>
              )}

              {/* Reply Form */}
              {replyingId === item.id ? (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write an official store manager response..."
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setReplyingId(null)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSendReply(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post Response
                    </button>
                  </div>
                </div>
              ) : (
                !item.managerResponse && (
                  <button
                    onClick={() => {
                      setReplyingId(item.id);
                      setReplyText('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply to customer
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManagerFeedbackPage;
