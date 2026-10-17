import React from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  Coins,
  FileCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export function DecisionDetailModal({
  decision,
  liveBatches = [],
  onClose,
  onNavigateToInventory
}) {
  if (!decision) return null;

  const batch = decision.batchSnapshot || {
    batchId: decision.batchId,
    productName: decision.productName,
    startingQuantity: decision.allocatedQuantity + decision.unsoldQuantity,
    originalSellingPrice: decision.originalPrice,
    incrementalCostPerUnit: decision.incrementalCost,
    isExpired: decision.eligible === false
  };

  const scenario = decision.scenarioSnapshot || {
    proposedSellingPrice: decision.proposedPrice,
    markdownPercentage: decision.originalPrice && decision.proposedPrice
      ? Math.round(((decision.originalPrice - decision.proposedPrice) / decision.originalPrice) * 100)
      : 0,
    demandMode: 'MANUAL',
    inputDemand: decision.allocatedQuantity
  };

  const outcome = decision.calculatedOutcome || {
    projectedQuantitySold: decision.allocatedQuantity ?? 0,
    projectedUnsoldQuantity: decision.unsoldQuantity ?? 0,
    projectedRevenue: (decision.allocatedQuantity ?? 0) * (decision.proposedPrice ?? 0),
    projectedContribution: decision.totalContribution ?? 0,
    unitContribution: decision.unitContribution ?? 0,
    unmetDemand: decision.unmetDemand ?? null,
    eligibilityResult: { eligible: decision.eligible ?? true },
    actionType: decision.actionType
  };

  const isEligible = outcome.eligibilityResult?.eligible ?? decision.eligible ?? true;
  const isSale = decision.decisionStatus === 'APPROVED_MARKDOWN' ||
    decision.actionType === 'RECOMMEND_MARKDOWN_SALE' ||
    outcome.actionType === 'RECOMMEND_MARKDOWN_SALE';

  // Check if this batch is still present in live inventory
  const liveBatch = liveBatches.find(b => b.id === (batch.batchId || decision.batchId));

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-detail-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              isSale
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}>
              {isSale ? <ShieldCheck className="w-6 h-6" /> : <AlertOctagon className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="decision-detail-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Decision Record
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  {decision.id}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Schema v{decision.schemaVersion || '1.0.0'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Recorded: {decision.savedAtFormatted || decision.timestampFormatted || decision.savedAt || decision.timestamp}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-slate-800">
          {/* Status Badge & Action Summary */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            isSale
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
              : 'bg-rose-50/90 border-rose-200 text-rose-950'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isSale
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  {isSale ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{isSale ? 'Approved Markdown Decision' : 'Quarantine / Disposal Action'}</span>
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Action: {decision.decisionStatus || decision.actionType || outcome.actionType}
                </span>
              </div>
              <p className="text-xs mt-1.5 leading-relaxed font-medium">
                {outcome.explanation || decision.explanation || 'Recorded decision audit trail.'}
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Projected Contribution</span>
              <span className="text-2xl font-extrabold text-emerald-700 block mt-0.5">
                ₹{outcome.projectedContribution ?? decision.totalContribution ?? 0}
              </span>
            </div>
          </div>

          {/* Section 1: Batch Snapshot (Frozen Historical State) */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Batch Snapshot (Frozen at Time of Decision)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Batch ID: {batch.batchId || decision.batchId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Product</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {batch.productName || decision.productName}
                </span>
                <span className="text-[10px] text-slate-500">{batch.category || 'Perishable'}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Starting Quantity</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {batch.startingQuantity !== undefined ? batch.startingQuantity : decision.allocatedQuantity + decision.unsoldQuantity} units
                </span>
                <span className="text-[10px] text-slate-500">Historical stock</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Original Price</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  ₹{batch.originalSellingPrice !== undefined ? batch.originalSellingPrice : decision.originalPrice}
                </span>
                <span className="text-[10px] text-slate-500">
                  Cost: ₹{batch.incrementalCostPerUnit !== undefined ? batch.incrementalCostPerUnit : decision.incrementalCost}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Batch Condition</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {batch.isExpired ? '⚠️ Expired' : batch.coldChainStatus === 'exception' ? '❄️ Cold-Chain Review' : '✓ Good'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {batch.expiryTimestamp ? `Exp: ${String(batch.expiryTimestamp).slice(0, 10)}` : 'Checked'}
                </span>
              </div>
            </div>

            {/* Live Inventory Status Cross-Check */}
            {liveBatch ? (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-lg text-xs text-blue-900 flex items-center justify-between">
                <span>
                  <strong>Live Inventory Status:</strong> Batch is currently active with <strong>{liveBatch.qty} units</strong> on hand.
                </span>
                {onNavigateToInventory && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToInventory(liveBatch.id);
                    }}
                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline text-[11px] cursor-pointer"
                  >
                    <span>View current batch</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100 rounded-lg text-xs text-slate-600">
                Live inventory note: This batch is no longer present in current active inventory. Historical snapshot is preserved.
              </div>
            )}
          </div>

          {/* Section 2: Scenario Snapshot */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Selected Scenario Inputs
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Proposed Price</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  ₹{scenario.proposedSellingPrice !== undefined ? scenario.proposedSellingPrice : decision.proposedPrice}
                </span>
                <span className="text-[10px] text-slate-500">
                  {scenario.markdownPercentage || 0}% discount
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Demand Scenario</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {scenario.inputDemand !== null && scenario.inputDemand !== undefined ? `${scenario.inputDemand} units` : 'Unspecified'}
                </span>
                <span className="text-[10px] text-slate-500">Mode: {scenario.demandMode || 'Manual'}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Demand Evidence</span>
                <span className="font-bold text-slate-900 block mt-0.5 truncate" title={scenario.demandEvidenceClassification || 'Fixture Assumption'}>
                  {scenario.demandEvidenceClassification || 'Fixture Assumption'}
                </span>
                <span className="text-[10px] text-slate-500">Classification</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 block font-medium">Minimum Policy</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  ≥ ₹{scenario.minContributionRequirement || 0} / unit
                </span>
                <span className="text-[10px] text-slate-500">Floor requirement</span>
              </div>
            </div>
          </div>

          {/* Section 3: Calculated Outcome Breakdown */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Calculated Outcome (Projected Simulation)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl">
                <span className="text-emerald-800 font-medium block">Projected Units Sold</span>
                <span className="text-xl font-extrabold text-emerald-950 mt-0.5 block">
                  {outcome.projectedQuantitySold !== undefined ? outcome.projectedQuantitySold : decision.allocatedQuantity} <span className="text-xs font-normal text-emerald-700">units</span>
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">min(stock, demand)</span>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl">
                <span className="text-amber-800 font-medium block">Projected Unsold Stock</span>
                <span className="text-xl font-extrabold text-amber-950 mt-0.5 block">
                  {outcome.projectedUnsoldQuantity !== undefined ? outcome.projectedUnsoldQuantity : decision.unsoldQuantity} <span className="text-xs font-normal text-amber-700">units</span>
                </span>
                <span className="text-[10px] text-amber-700 block mt-0.5">visibly accounted for</span>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded-xl">
                <span className="text-slate-500 font-medium block">Unit Contribution</span>
                <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
                  ₹{outcome.unitContribution !== undefined ? outcome.unitContribution : decision.unitContribution}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">price − cost</span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl">
                <span className="text-emerald-800 font-medium block">Projected Contribution</span>
                <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">
                  ₹{outcome.projectedContribution !== undefined ? outcome.projectedContribution : decision.totalContribution}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">unit margin × sold</span>
              </div>
            </div>

            {outcome.unmetDemand > 0 && (
              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800 flex items-center justify-between">
                <span>Unmet Customer Demand:</span>
                <span className="font-bold">{outcome.unmetDemand} units</span>
              </div>
            )}
          </div>

          {/* Section 4: Provenance & Audit Discipline */}
          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              <FileCheck className="w-4 h-4" />
              <span>Immutable Audit Trail & Provenance</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Signed by <strong>{decision.managerName || 'Demo Manager'}</strong>.
              Recorded under schema version <strong>{decision.schemaVersion || '1.0.0'}</strong>.
              Source: <em>{decision.provenance?.source || 'FYND_C30_SIMULATOR'}</em>.
            </p>
            <p className="text-slate-400 text-[11px] border-t border-slate-800 pt-2 leading-relaxed">
              <strong>Evidence Disclaimer:</strong> This decision record preserves the manager's chosen scenario and the domain engine's projected calculation. It is not proof that the markdown was applied in point-of-sale systems, that customer transactions occurred, or that waste was avoided.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 pt-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
