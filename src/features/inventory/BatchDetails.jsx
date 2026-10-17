import React from 'react';
import {
  X,
  Calendar,
  Tag,
  Coins,
  Package,
  CheckCircle2,
  AlertOctagon,
  Snowflake,
  TrendingUp,
  Percent,
  ArrowRight
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function BatchDetails({ batch, onClose, onViewInInventory = null, onAction = null }) {
  if (!batch) return null;

  const isEligible = batch.eligibility?.eligible === true;
  const isExpired = batch.expired === true;
  const isColdChain = batch.coldChainStatus === 'exception';

  const statusLabel = isEligible ? 'Eligible for Sale' : isExpired ? 'Blocked: Expired' : isColdChain ? 'Blocked: Cold-chain Issue' : 'Blocked from Sale';
  const statusType = isEligible ? 'ELIGIBLE' : isExpired ? 'EXPIRED' : isColdChain ? 'COLD_CHAIN_REVIEW' : 'DAMAGED';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-fadeIn">
      {/* Top Header Row with Product Visual & Close Button */}
      <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100">
        <div className="flex items-center gap-4">
          {/* Large Product Thumbnail Box */}
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shadow-xs shrink-0">
            {batch.image || '📦'}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{batch.productName}</h2>
              <StatusBadge status={statusType} label={statusLabel} />
            </div>
            <p className="text-xs font-mono text-slate-500 mt-1">Batch ID: {batch.id}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Row 1: 4-Column Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Quantity on hand */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>Quantity on hand</span>
            </span>
            <div className="text-base font-bold text-slate-900">{batch.qty} units</div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Expiry date</span>
            </span>
            <div className="text-base font-bold text-slate-900">
              {batch.expiryDisplay || '20 Oct 2026'}
            </div>
            <p className="text-[11px] text-slate-400">({batch.expiryNote || 'in 4 days'})</p>
          </div>

          {/* Original Price */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Original price</span>
            </span>
            <div className="text-base font-bold text-slate-900">₹{batch.originalPrice}</div>
          </div>

          {/* Incremental Cost */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              <span>Incremental cost (per unit)</span>
            </span>
            <div className="text-base font-bold text-slate-900">₹{batch.incrementalCost}</div>
          </div>
        </div>

        {/* Row 2: 4-Column Attribute Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          {/* Condition */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Condition</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 capitalize">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{batch.condition || 'Good'}</span>
            </div>
          </div>

          {/* Cold-chain */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Cold-chain</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <Snowflake className="w-4 h-4 text-sky-500" />
              <span className="capitalize">
                {batch.coldChainStatus === 'exception' ? 'Exception' : batch.coldChainStatus === 'ok' ? 'Required (OK)' : 'Not required'}
              </span>
            </div>
          </div>

          {/* Demand Evidence */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Demand evidence</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>{batch.demandEvidence || 'Available (High)'}</span>
            </div>
          </div>

          {/* Allowed Markdown */}
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">Allowed markdown</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <Percent className="w-4 h-4 text-slate-400" />
              <span>Up to {batch.allowedMarkdownPercent || 40}%</span>
            </div>
          </div>
        </div>

        {/* Eligibility Reason Highlight Card (From Mockup Image) */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          isEligible
            ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {isEligible ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Eligibility Reason</h3>
            <p className="text-xs font-medium text-slate-700 mt-1 leading-relaxed">
              {batch.eligibility?.reason || (isEligible ? 'This batch is eligible for sale. No expiry, damage or cold-chain issues detected.' : 'Batch is blocked from sale under safety rules.')}
            </p>
          </div>
        </div>

        {/* Action Buttons at Bottom */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => {
              if (onViewInInventory) onViewInInventory();
              else onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            View in Inventory
          </button>
          <button
            onClick={() => onAction && onAction(batch)}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
          >
            <span>Open Markdown Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
