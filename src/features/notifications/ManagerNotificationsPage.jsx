/**
 * ManagerNotificationsPage.jsx — Store Manager Notification Center
 * 
 * Displays real-time operational alerts, incoming customer orders,
 * community donation contributions, and stock expiry alerts.
 */

import React from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  Package,
  Heart,
  MessageSquare,
  AlertTriangle,
  Clock,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { useNotifications } from '../../lib/notificationContext.js';

const ICONS = {
  order: Package,
  donation: Heart,
  feedback: MessageSquare,
  warning: AlertTriangle,
  inventory: Clock,
  alert: AlertTriangle,
  info: Bell
};

const TYPE_STYLES = {
  order: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  donation: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  feedback: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  inventory: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  alert: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  info: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
};

export function ManagerNotificationsPage({ onNavigate }) {
  const { notifications, unreadCount, markAsRead, markAllRead, clearNotification } = useNotifications();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time activity feed: incoming customer orders, verified ₹1 donations, and food safety alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors self-start"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-800 text-base mb-1">No notifications yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Operational alerts, customer recovery orders, and donation confirmations will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const Icon = ICONS[notif.type] || Bell;
            const style = TYPE_STYLES[notif.type] || TYPE_STYLES.info;

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  notif.is_read
                    ? 'bg-white border-slate-200/80 shadow-xs'
                    : 'bg-emerald-50/20 border-emerald-200/80 shadow-sm'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${style.bg} ${style.border}`}>
                  <Icon className={`w-5 h-5 ${style.text}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-slate-900">{notif.title}</span>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {new Date(notif.created_at).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {!notif.is_read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Mark read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => clearNotification(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ManagerNotificationsPage;
