import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Package,
  Check,
  Bell,
  Info
} from 'lucide-react';
import { EligibilityStatus } from '../domain/eligibility.js';

export function StatusBadge({ status, label = null, className = '' }) {
  const normalized = String(status || '').toUpperCase().trim();

  // Fresh / Eligible
  if (normalized === 'ELIGIBLE' || normalized === 'FRESH' || normalized === 'GOOD') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Eligible'}</span>
      </span>
    );
  }

  // Near Expiry / Expiring Soon
  if (normalized === 'EXPIRING_SOON' || normalized === 'NEAR_EXPIRY') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}>
        <Clock className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Expiring Soon'}</span>
      </span>
    );
  }

  // Critical / Expiring within a few hours
  if (normalized === 'CRITICAL' || normalized === 'HOURS_REMAINING') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200/80 ${className}`}>
        <Clock className="w-3 h-3 text-orange-600 shrink-0 animate-pulse" aria-hidden="true" />
        <span>{label || 'Expiring in hours'}</span>
      </span>
    );
  }

  // Expired
  if (normalized === 'EXPIRED') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
        <XCircle className="w-3 h-3 text-rose-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Expired'}</span>
      </span>
    );
  }

  // Damaged
  if (normalized === 'DAMAGED') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}>
        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Damaged'}</span>
      </span>
    );
  }

  // Cold Chain Exception / Quarantined
  if (normalized === 'COLD_CHAIN_REVIEW' || normalized === 'COLD_CHAIN' || normalized === 'QUARANTINED') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
        <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Quarantined'}</span>
      </span>
    );
  }

  // Sold Out
  if (normalized === 'SOLD_OUT') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
        <Package className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
        <span>{label || 'Sold Out'}</span>
      </span>
    );
  }

  // Payment Status: Paid / Success
  if (normalized === 'PAID' || normalized === 'SUCCESS') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}>
        <Check className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Paid'}</span>
      </span>
    );
  }

  // Payment Status: Pending
  if (normalized === 'PENDING') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}>
        <Clock className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Pending'}</span>
      </span>
    );
  }

  // Payment Status: Failed
  if (normalized === 'FAILED') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
        <XCircle className="w-3 h-3 text-rose-600 shrink-0" aria-hidden="true" />
        <span>{label || 'Failed'}</span>
      </span>
    );
  }

  // Notification: Unread
  if (normalized === 'UNREAD') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 ${className}`}>
        <Bell className="w-3 h-3 text-sky-600 shrink-0" aria-hidden="true" />
        <span>{label || 'New'}</span>
      </span>
    );
  }

  // Notification: Read
  if (normalized === 'READ') {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 ${className}`}>
        <Check className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
        <span>{label || 'Read'}</span>
      </span>
    );
  }

  // Default fallback
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
      <Info className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
      <span>{label || status || 'Unknown'}</span>
    </span>
  );
}
