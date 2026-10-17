/**
 * CustomerNotificationsPage.jsx — Customer Notification Center
 */

import React from 'react';
import { Bell, Check, CheckCheck, Package, Heart, MessageSquare, AlertTriangle, Trash2 } from 'lucide-react';
import { useNotifications } from '../../lib/notificationContext.js';

const ICONS = {
  order: Package,
  donation: Heart,
  feedback: MessageSquare,
  warning: AlertTriangle,
  info: Bell
};

export function CustomerNotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearNotification } = useNotifications();

  if (notifications.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
          <Bell className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">No notifications</h2>
        <p className="text-slate-500 text-sm">You'll be notified about orders, payments, and updates</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
              {unreadCount} new
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map(notif => {
          const Icon = ICONS[notif.type] || Bell;
          return (
            <div
              key={notif.id}
              className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all ${
                notif.is_read
                  ? 'border-slate-200'
                  : 'border-emerald-200 bg-emerald-50/30'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                notif.is_read ? 'bg-slate-100' : 'bg-emerald-100'
              }`}>
                <Icon className={`w-4 h-4 ${notif.is_read ? 'text-slate-500' : 'text-emerald-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                  {notif.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(notif.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!notif.is_read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => clearNotification(notif.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
