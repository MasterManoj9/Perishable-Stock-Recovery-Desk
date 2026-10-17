import React from 'react';
import { EligibilityStatus } from '../domain/eligibility.js';

export function StatusBadge({ status, label = null, className = '' }) {
  if (status === 'EXPIRING_SOON' || status === 'expiring_soon') {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}>
        {label || 'Expiring Soon'}
      </span>
    );
  }

  switch (status) {
    case EligibilityStatus.ELIGIBLE:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}>
          {label || 'Eligible'}
        </span>
      );

    case EligibilityStatus.EXPIRED:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
          {label || 'Expired'}
        </span>
      );

    case EligibilityStatus.DAMAGED:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}>
          {label || 'Damaged'}
        </span>
      );

    case EligibilityStatus.COLD_CHAIN_REVIEW:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
          {label || 'Cold-chain Issue'}
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          {label || status || 'Unknown'}
        </span>
      );
  }
}
