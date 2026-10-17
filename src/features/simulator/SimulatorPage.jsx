import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Tag,
  Coins,
  Package,
  Layers,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { generateRecommendation, ActionType } from '../../domain/recommendations.js';
import { checkEligibility } from '../../domain/eligibility.js';
import { roundCurrency } from '../../domain/economics.js';
import { DecisionConfirmModal } from './DecisionConfirmModal.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function SimulatorPage({
  batches = [],
  initialBatchId = null,
  onRecordDecision,
  onNavigateToDecisions
}) {
  const [selectedBatchId, setSelectedBatchId] = useState(
    initialBatchId || (batches.length > 0 ? batches[0].id : null)
  );

  // Sync if initialBatchId changes
  useEffect(() => {
    if (initialBatchId) {
      setSelectedBatchId(initialBatchId);
    }
  }, [initialBatchId]);

  const activeBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || batches[0] || null;
  }, [batches, selectedBatchId]);

  // Simulation inputs
  const [proposedPrice, setProposedPrice] = useState(
    activeBatch?.originalPrice ?? 40
  );
  const [supportedDemand, setSupportedDemand] = useState(
    activeBatch?.demandAssumption ?? 10
  );
  const [minContributionPolicy, setMinContributionPolicy] = useState(0); // Configurable business policy floor
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Reset inputs when selected batch changes
  useEffect(() => {
    if (activeBatch) {
      setProposedPrice(activeBatch.originalPrice);
      setSupportedDemand(activeBatch.demandAssumption !== undefined && activeBatch.demandAssumption !== null ? activeBatch.demandAssumption : 10);
    }
  }, [activeBatch]);

  // Evaluate pure recommendation engine
  const recommendation = useMemo(() => {
    if (!activeBatch) return null;

    return generateRecommendation(
      activeBatch,
      { proposedPrice: Number(proposedPrice), supportedDemand: Number(supportedDemand) },
      { minContributionPolicy: { minUnitContribution: Number(minContributionPolicy) } }
    );
  }, [activeBatch, proposedPrice, supportedDemand, minContributionPolicy]);

  if (!activeBatch) {
    return (
      <div className="p-8 text-center text-slate-500">
        No batches available for simulation. Please select or load a dataset.
      </div>
    );
  }

  const isEligible = activeBatch.eligibility?.eligible === true;
  const originalPrice = activeBatch.originalPrice;
  const incrementalCost = activeBatch.incrementalCost;
  const maxAllowedMarkdownPercent = activeBatch.allowedMarkdownPercent || 40;
  const minAllowedPrice = Math.max(
    incrementalCost,
    roundCurrency(originalPrice * (1 - maxAllowedMarkdownPercent / 100))
  );

  const discountPercent = originalPrice > 0
    ? Math.max(0, Math.round(((originalPrice - proposedPrice) / originalPrice) * 100))
    : 0;

  const handleCommitDecision = () => {
    if (!recommendation) return;

    const decisionRecord = {
      batchId: activeBatch.id,
      productName: activeBatch.productName,
      category: activeBatch.category,
      originalPrice,
      proposedPrice: isEligible ? Number(proposedPrice) : originalPrice,
      incrementalCost,
      unitContribution: recommendation.unitContribution,
      allocatedQuantity: recommendation.allocatedQuantity,
      unsoldQuantity: recommendation.unsoldQuantity,
      unmetDemand: recommendation.unmetDemand,
      totalContribution: recommendation.totalContribution,
      actionType: recommendation.recommendedAction,
      eligible: isEligible,
      explanation: recommendation.explanation
    };

    onRecordDecision(decisionRecord);
    setToastMessage(`Action for ${activeBatch.id} committed to Decision Log!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-emerald-900 text-white rounded-xl shadow-lg flex items-center justify-between border border-emerald-700 animate-slideDown">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          {onNavigateToDecisions && (
            <button
              onClick={onNavigateToDecisions}
              className="text-xs font-bold text-emerald-300 hover:text-white underline ml-4 cursor-pointer"
            >
              View Decision History →
            </button>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Markdown Simulator</h1>
          <p className="text-sm text-slate-500 mt-1">
            Simulate prices, allocate demand, enforce safety gates, and optimize contribution.
          </p>
        </div>

        {/* Batch Selector Dropdown */}
        <div className="flex items-center gap-2.5">
          <label htmlFor="batch-select" className="text-xs font-bold text-slate-600">Active Batch:</label>
          <select
            id="batch-select"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.productName} ({b.qty} units • ₹{b.originalPrice}) {b.expired ? '⚠️ Expired' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Outcome on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Batch Card & Parameter Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Batch Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shrink-0">
                  {activeBatch.image || '📦'}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">{activeBatch.productName}</h2>
                    <StatusBadge
                      status={isEligible ? 'ELIGIBLE' : activeBatch.expired ? 'EXPIRED' : 'COLD_CHAIN_REVIEW'}
                      label={isEligible ? 'Eligible for Sale' : activeBatch.expired ? 'Blocked: Expired' : 'Blocked from Sale'}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Batch ID: {activeBatch.id} • Category: {activeBatch.category || 'Perishable'} • Units: {activeBatch.qty}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Original Price</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">₹{originalPrice}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Incremental Cost</span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">₹{incrementalCost}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Original Margin</span>
                <div className="text-sm font-bold text-emerald-700 mt-0.5">
                  +₹{roundCurrency(originalPrice - incrementalCost)}/unit
                </div>
              </div>
            </div>
          </div>

          {/* Safety Gate Warning (if blocked) */}
          {!isEligible && (
            <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 space-y-3">
              <div className="flex items-center gap-2.5 font-bold text-sm text-rose-700">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>FOOD SAFETY HARD-STOP: SALE BLOCKED</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                {activeBatch.expired
                  ? `Batch ${activeBatch.id} is EXPIRED. Organizing rule 1 strictly blocks expired stock. Sellable quantity is forced to 0 regardless of apparent margin (+₹${originalPrice - incrementalCost}).`
                  : activeBatch.eligibility?.reason || 'Batch is blocked from sale under safety rules.'}
              </p>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700">Required Action: Disposal / Quarantine</span>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Record Quarantine Action
                </button>
              </div>
            </div>
          )}

          {/* Interactive Simulation Controls (Only active if eligible) */}
          {isEligible ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Simulation Parameters</span>
                </h3>
                <button
                  onClick={() => {
                    setProposedPrice(originalPrice);
                    setSupportedDemand(activeBatch.demandAssumption || 10);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Slider 1: Proposed Markdown Price */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="price-slider" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Proposed Selling Price (INR ₹)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {discountPercent}% OFF
                    </span>
                    <input
                      id="price-input"
                      type="number"
                      min={incrementalCost}
                      max={originalPrice}
                      step={1}
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(Math.max(incrementalCost, Math.min(originalPrice, Number(e.target.value))))}
                      className="w-20 px-2.5 py-1 text-right text-sm font-bold border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <input
                  id="price-slider"
                  type="range"
                  min={minAllowedPrice}
                  max={originalPrice}
                  step={1}
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Min Allowed: ₹{minAllowedPrice} (Cost: ₹{incrementalCost})</span>
                  <span>Original: ₹{originalPrice}</span>
                </div>
              </div>

              {/* Input 2: Supported Demand Assumption */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label htmlFor="demand-input" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supported Demand Scenario (Units)</span>
                  </label>
                  <input
                    id="demand-input"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={supportedDemand}
                    onChange={(e) => setSupportedDemand(Math.max(0, Number(e.target.value)))}
                    className="w-20 px-2.5 py-1 text-right text-sm font-bold border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Demand Presets */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Quick Scenarios:</span>
                  {[
                    { label: 'Pessimistic (5)', val: 5 },
                    { label: 'Base (10)', val: 10 },
                    { label: 'Optimistic (15)', val: 15 },
                    { label: 'Zero (0)', val: 0 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSupportedDemand(preset.val)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                        supportedDemand === preset.val
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Policy Floor Option (Business Feedback Demonstration) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">Store Minimum Contribution Policy:</span>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 5, 10].map(threshold => (
                    <button
                      key={threshold}
                      type="button"
                      onClick={() => setMinContributionPolicy(threshold)}
                      className={`text-xs px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer ${
                        minContributionPolicy === threshold
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ₹{threshold}/u
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Column: Live Outcome Dashboard & Commit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Live Outcome Preview</h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Simulated Model</span>
              </div>

              {/* Outcome Metrics */}
              <div className="space-y-4 mt-5">
                {/* Total Recovery / Contribution */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Total Contribution Recovery
                  </span>
                  <div className="text-3xl font-extrabold text-emerald-900 mt-1">
                    ₹{recommendation?.totalContribution ?? 0}
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    {recommendation?.allocatedQuantity ?? 0} units × ₹{recommendation?.unitContribution ?? 0}/unit
                  </p>
                </div>

                {/* Unit Contribution */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Unit Contribution</span>
                    <div className="text-xl font-bold text-slate-900 mt-0.5">
                      ₹{recommendation?.unitContribution ?? 0}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400 font-mono">
                    ₹{proposedPrice} − ₹{incrementalCost}
                  </div>
                </div>

                {/* Stock Allocation & Unsold Balance */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-slate-500 font-medium">Allocated Quantity</span>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {recommendation?.allocatedQuantity ?? 0} <span className="text-xs font-normal text-slate-500">units</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">min(stock, demand)</span>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                    <span className="text-amber-800 font-medium">Unsold Units</span>
                    <div className="text-lg font-bold text-amber-900 mt-1">
                      {recommendation?.unsoldQuantity ?? activeBatch.qty} <span className="text-xs font-normal text-amber-700">units</span>
                    </div>
                    <span className="text-[10px] text-amber-600 block mt-0.5">strictly accounted</span>
                  </div>
                </div>

                {/* Unmet Demand (if any) */}
                {recommendation?.unmetDemand > 0 && (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center justify-between">
                    <span>Unmet Demand:</span>
                    <span className="font-bold">{recommendation.unmetDemand} units</span>
                  </div>
                )}

                {/* Policy Warning if below threshold */}
                {isEligible && minContributionPolicy > 0 && recommendation?.unitContribution < minContributionPolicy && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Warning: Unit contribution (₹{recommendation.unitContribution}) is below store policy (₹{minContributionPolicy}).</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Commit Button */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!isEligible && activeBatch.expired === false}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  isEligible
                    ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/10'
                    : 'bg-rose-700 hover:bg-rose-800 shadow-rose-700/10'
                }`}
              >
                <span>{isEligible ? 'Commit Markdown Decision' : 'Record Quarantine Action'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <DecisionConfirmModal
          batch={activeBatch}
          recommendation={recommendation}
          onConfirm={handleCommitDecision}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
