/**
 * notificationContext.js — In-App Notification System
 * 
 * Provides notification state for both managers and customers.
 * Notifications are stored in localStorage in demo mode.
 * In production, they come from the Supabase notifications table.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext(null);
const NOTIFICATIONS_KEY = 'c30_notifications';

function loadNotifications(userId) {
  try {
    const raw = localStorage.getItem(`${NOTIFICATIONS_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistNotifications(userId, notifications) {
  localStorage.setItem(`${NOTIFICATIONS_KEY}_${userId}`, JSON.stringify(notifications));
}

export function NotificationProvider({ children, userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (userId) {
      setNotifications(loadNotifications(userId));
    } else {
      setNotifications([]);
    }
  }, [userId]);

  const addNotification = useCallback(({
    type = 'info',
    title,
    message,
    relatedType = null,
    relatedId = null,
    recipientId = null
  }) => {
    const targetId = recipientId || userId;
    if (!targetId) return;

    const notification = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      relatedType,
      relatedId,
      is_read: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => {
      const updated = [notification, ...prev];
      persistNotifications(targetId, updated);
      return targetId === userId ? updated : prev;
    });

    // If sending to a different user, save directly
    if (targetId !== userId) {
      const otherNotifs = loadNotifications(targetId);
      persistNotifications(targetId, [notification, ...otherNotifs]);
    }

    return notification;
  }, [userId]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      if (userId) persistNotifications(userId, updated);
      return updated;
    });
  }, [userId]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, is_read: true }));
      if (userId) persistNotifications(userId, updated);
      return updated;
    });
  }, [userId]);

  const clearNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      if (userId) persistNotifications(userId, updated);
      return updated;
    });
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllRead,
    clearNotification
  };

  return React.createElement(NotificationContext.Provider, { value }, children);
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
