import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export function DecisionConfirmModal({
  batch,
  recommendation,
  onConfirm,
  onClose
}) {
  if (!batch || !recommendation) return null;

  const isEligible = recommendation.eligible;
  const isMarkdown = recommendation.recommendedAction === 'RECOMMEND_MARKDOWN_SALE';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isEligible ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {isEligible ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Confirm Decision Action</h3>
              <p className="text-xs text-slate-500">Review before committing to the decision audit log.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Batch Snapshot */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900">{batch.productName}</div>
              <div className="text-xs text-slate-500 font-mono">Batch ID: {batch.id} • {batch.category || 'Perishable'}</div>
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isEligible ? 'Eligible' : 'Blocked'}
            </div>
          </div>

          {/* Action Summary */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Planned Action</span>
            <div className="p-3 rounded-xl bg-slate-900 text-white font-medium text-xs flex items-center justify-between">
              <span>{recommendation.recommendedAction}</span>
              <span className="font-mono text-emerald-400">
                {isMarkdown ? `₹${recommendation.proposedPrice} / unit` : 'Disposal / Quarantine'}
              </span>
            </div>
          </div>

          {/* Key Metrics Comparison Table */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Allocated Quantity</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {recommendation.allocatedQuantity} units
              </span>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60">
              <span className="text-amber-800 font-medium block">Unsold Stock (Remaining)</span>
              <span className="text-base font-bold text-amber-900 mt-1 block">
                {recommendation.unsoldQuantity} units
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 font-medium block">Unit Contribution</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                ₹{recommendation.unitContribution}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
              <span className="text-emerald-800 font-medium block">Total Contribution Recovery</span>
              <span className="text-base font-bold text-emerald-900 mt-1 block">
                ₹{recommendation.totalContribution}
              </span>
            </div>
          </div>

          {/* Manager & Evidence Note */}
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/80 flex items-start gap-2.5">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Signed by <strong className="text-slate-900">Demo Manager</strong>. This action will be immutably recorded in the local decision store for auditing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>Confirm & Record Action</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
