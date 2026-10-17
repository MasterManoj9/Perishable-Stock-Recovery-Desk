/**
 * CustomerFeedbackPage.jsx — Customer Feedback Submission & History
 */

import React, { useState, useMemo } from 'react';
import { MessageSquare, Star, Send, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../lib/auth.js';
import { getFeedback, submitFeedback } from '../../data/orderStore.js';
import { getOrders } from '../../data/orderStore.js';

const CATEGORIES = [
  { value: 'product_quality', label: '🥬 Product Quality' },
  { value: 'pricing', label: '💰 Pricing & Discounts' },
  { value: 'delivery', label: '📦 Delivery' },
  { value: 'app_experience', label: '📱 App Experience' },
  { value: 'customer_service', label: '🤝 Customer Service' },
  { value: 'general', label: '💬 General' }
];

export function CustomerFeedbackPage() {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const myFeedback = useMemo(() => {
    return getFeedback(f => f.customerId === user?.id);
  }, [user?.id, submitted]);

  const myOrders = useMemo(() => {
    return getOrders(user?.id);
  }, [user?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (message.trim().length < 5) {
      setError('Please provide at least 5 characters of feedback');
      return;
    }

    try {
      submitFeedback({
        customerId: user?.id,
        customerName: profile?.full_name || 'Customer',
        orderId: orderId || null,
        rating,
        category,
        message
      });

      setSubmitted(true);
      setRating(0);
      setMessage('');
      setCategory('general');
      setOrderId('');

      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Feedback</h2>

      {/* Submission Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <h3 className="font-semibold text-slate-800 mb-4">Share Your Experience</h3>

        {submitted && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">Thank you for your feedback!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Rating *</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-slate-500 self-center">
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Very Poor'}
                </span>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    category === cat.value
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Related Order */}
          {myOrders.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Related Order (optional)</label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">No specific order</option>
                {myOrders.map(o => (
                  <option key={o.id} value={o.id}>{o.id} — ₹{o.total}</option>
                ))}
              </select>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Your Feedback *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">{message.length}/500 characters</p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Submit Feedback
          </button>
        </form>
      </div>

      {/* Previous Feedback */}
      {myFeedback.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">Your Previous Feedback</h3>
          <div className="space-y-3">
            {myFeedback.map(fb => (
              <div key={fb.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    fb.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {fb.status}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{fb.message}</p>
                <p className="text-[10px] text-slate-400 mt-2">
                  {new Date(fb.created_at).toLocaleString('en-IN', { dateStyle: 'medium' })}
                </p>
                {fb.managerResponse && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1">Manager Response:</p>
                    <p className="text-xs text-slate-700">{fb.managerResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
