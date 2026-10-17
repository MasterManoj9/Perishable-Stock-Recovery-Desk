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
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  AlertOctagon,
  Percent,
  Calendar,
  Snowflake
} from 'lucide-react';
import { generateRecommendation, ActionType } from '../../domain/recommendations.js';
import { checkEligibility, EligibilityStatus } from '../../domain/eligibility.js';
import {
  calculateUnitContribution,
  calculateTotalContribution,
  calculateDiscountPercent,
  checkAllowedMarkdownLimit,
  checkMinimumContribution,
  roundCurrency
} from '../../domain/economics.js';
import { allocateStock, DemandStatus } from '../../domain/allocation.js';
import { DecisionConfirmModal } from './DecisionConfirmModal.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function SimulatorPage({
  batches = [],
  initialBatchId = null,
  onRecordDecision,
  onNavigateToDecisions,
  onNavigateToInventory
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
  const [proposedPriceInput, setProposedPriceInput] = useState(
    activeBatch?.originalPrice !== undefined ? String(activeBatch.originalPrice) : '40'
  );
  const [markdownPercentInput, setMarkdownPercentInput] = useState('0');
  const [demandInput, setDemandInput] = useState(
    activeBatch?.demandAssumption !== undefined && activeBatch.demandAssumption !== null
      ? String(activeBatch.demandAssumption)
      : '10'
  );
  const [demandMode, setDemandMode] = useState('FIXTURE'); // 'FIXTURE' | 'CUSTOM' | 'ZERO' | 'MISSING'
  const [minContributionPolicy, setMinContributionPolicy] = useState(0); // Store policy threshold
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Reset inputs when activeBatch changes
  useEffect(() => {
    if (activeBatch) {
      const origPrice = activeBatch.originalPrice ?? 40;
      setProposedPriceInput(String(origPrice));
      setMarkdownPercentInput('0');
      const fixtureDemand = activeBatch.demandAssumption !== undefined && activeBatch.demandAssumption !== null
        ? activeBatch.demandAssumption
        : 10;
      setDemandInput(String(fixtureDemand));
      setDemandMode('FIXTURE');
    }
  }, [activeBatch]);

  // Handle Price changes (syncing Markdown %)
  const handlePriceChange = (valStr) => {
    setProposedPriceInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num) && activeBatch?.originalPrice > 0) {
      const disc = calculateDiscountPercent(activeBatch.originalPrice, num);
      setMarkdownPercentInput(String(disc));
    }
  };

  // Handle Markdown % changes (syncing Proposed Price)
  const handleMarkdownPercentChange = (pctStr) => {
    setMarkdownPercentInput(pctStr);
    const pct = parseFloat(pctStr);
    if (!isNaN(pct) && activeBatch?.originalPrice > 0) {
      const calculatedPrice = roundCurrency(activeBatch.originalPrice * (1 - pct / 100));
      setProposedPriceInput(String(calculatedPrice));
    }
  };

  // Reset to initial batch values
  const handleResetToStarting = () => {
    if (activeBatch) {
      setProposedPriceInput(String(activeBatch.originalPrice));
      setMarkdownPercentInput('0');
      const fixtureDemand = activeBatch.demandAssumption !== undefined && activeBatch.demandAssumption !== null
        ? activeBatch.demandAssumption
        : 10;
      setDemandInput(String(fixtureDemand));
      setDemandMode('FIXTURE');
    }
  };

  // Parse numeric values safely
  const numericPrice = parseFloat(proposedPriceInput);
  const numericDemand = demandMode === 'MISSING'
    ? null
    : demandMode === 'ZERO'
    ? 0
    : parseInt(demandInput, 10);

  // Run pure domain recommendation engine
  const recommendation = useMemo(() => {
    if (!activeBatch) return null;

    return generateRecommendation(
      activeBatch,
      {
        proposedPrice: isNaN(numericPrice) ? null : numericPrice,
        supportedDemand: isNaN(numericDemand) ? null : numericDemand
      },
      { minContributionPolicy: { minUnitContribution: Number(minContributionPolicy) } }
    );
  }, [activeBatch, numericPrice, numericDemand, minContributionPolicy]);

  if (!activeBatch) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4">
        <AlertOctagon className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">No Inventory Batch Selected</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Please select a valid perishable inventory batch to begin markdown and demand simulation.
        </p>
        {onNavigateToInventory && (
          <button
            onClick={onNavigateToInventory}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Go to Inventory
          </button>
        )}
      </div>
    );
  }

  const isEligible = activeBatch.eligibility?.eligible === true;
  const originalPrice = activeBatch.originalPrice ?? 40;
  const incrementalCost = activeBatch.incrementalCost ?? 25;
  const maxAllowedMarkdownPercent = activeBatch.allowedMarkdownPercent || 40;
  const minAllowedPrice = roundCurrency(originalPrice * (1 - maxAllowedMarkdownPercent / 100));

  // Projected Financial Metrics
  const projectedSold = recommendation?.allocatedQuantity ?? 0;
  const projectedRevenue = roundCurrency(projectedSold * (isNaN(numericPrice) ? 0 : numericPrice));
  const projectedIncrementalCostTotal = roundCurrency(projectedSold * incrementalCost);
  const projectedContributionTotal = recommendation?.totalContribution ?? 0;
  const unitContribution = recommendation?.unitContribution ?? 0;
  const unsoldQuantity = recommendation?.unsoldQuantity ?? activeBatch.qty;

  // Validation Checks for UI Warning/Error Cards (Without silent clamping)
  const isPriceNegative = !isNaN(numericPrice) && numericPrice < 0;
  const isPriceExceedingOriginal = !isNaN(numericPrice) && numericPrice > originalPrice;
  const isPriceBelowCost = !isNaN(numericPrice) && numericPrice < incrementalCost;
  const isMarkdownExceedingLimit = !isNaN(numericPrice) && numericPrice < minAllowedPrice;
  const isDemandNegative = !isNaN(numericDemand) && numericDemand < 0;

  const handleCommitDecision = () => {
    if (!recommendation) return;

    const decisionRecord = {
      batchId: activeBatch.id,
      productName: activeBatch.productName,
      category: activeBatch.category,
      originalPrice,
      proposedPrice: isEligible ? numericPrice : originalPrice,
      incrementalCost,
      unitContribution,
      allocatedQuantity: projectedSold,
      unsoldQuantity,
      unmetDemand: recommendation.unmetDemand,
      totalContribution: projectedContributionTotal,
      actionType: recommendation.recommendedAction,
      eligible: isEligible,
      explanation: recommendation.explanation
    };

    if (onRecordDecision) {
      onRecordDecision(decisionRecord);
    }
    setToastMessage(`Decision snapshot for ${activeBatch.id} committed to log!`);
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

      {/* Header Bar with Batch Identity & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {onNavigateToInventory && (
              <button
                onClick={onNavigateToInventory}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Return to Inventory"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Interactive Markdown Simulator</h1>
          </div>
          <p className="text-sm text-slate-500">
            Simulate prices, evaluate demand capping, enforce food-safety gates, and inspect contribution recovery.
          </p>
        </div>

        {/* Batch Selector Dropdown */}
        <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
          <label htmlFor="batch-select" className="text-xs font-bold text-slate-600 pl-1">Batch:</label>
          <select
            id="batch-select"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.productName} ({b.qty} units • ₹{b.originalPrice}) {b.expired ? '⚠️ Expired' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 1: Comprehensive Batch Context Card (Mandated in Section 5) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shadow-xs shrink-0">
              {activeBatch.image || '📦'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{activeBatch.productName}</h2>
                <StatusBadge
                  status={isEligible ? 'ELIGIBLE' : activeBatch.expired ? 'EXPIRED' : activeBatch.coldChainStatus === 'exception' ? 'COLD_CHAIN_REVIEW' : 'DAMAGED'}
                  label={isEligible ? 'Eligible for Sale' : activeBatch.expired ? 'Blocked: Expired' : activeBatch.coldChainStatus === 'exception' ? 'Blocked: Cold Chain' : 'Blocked from Sale'}
                />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Batch ID: <strong>{activeBatch.id}</strong> • Category: <strong>{activeBatch.category || 'Perishable'}</strong> • Starting Stock: <strong>{activeBatch.qty} units</strong>
              </p>
            </div>
          </div>

          {/* Quick Return Action */}
          {onNavigateToInventory && (
            <button
              onClick={onNavigateToInventory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start lg:self-auto cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Inventory</span>
            </button>
          )}
        </div>

        {/* 6-Field Context Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Original Price</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">₹{originalPrice} / unit</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Incremental Cost</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">₹{incrementalCost} / unit</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Permitted Markdown</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">Up to {maxAllowedMarkdownPercent}%</span>
            <span className="text-[10px] text-slate-400 font-mono">(Min: ₹{minAllowedPrice})</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Expiry Status</span>
            <span className={`text-sm font-bold mt-0.5 block ${activeBatch.expired ? 'text-rose-600' : 'text-slate-900'}`}>
              {activeBatch.expiryDisplay || (activeBatch.expired ? 'Expired' : 'Healthy')}
            </span>
            <span className="text-[10px] text-slate-400">{activeBatch.expiryNote || ''}</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Cold-Chain Status</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block capitalize">
              {activeBatch.coldChainStatus === 'exception' ? 'Exception' : activeBatch.coldChainStatus === 'ok' ? 'Monitored (OK)' : 'Not Required'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Demand Evidence</span>
            <span className="text-sm font-bold text-emerald-700 mt-0.5 block">
              {activeBatch.demandEvidence || 'Fixture Evidenced'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Source: Starter Fixture</span>
          </div>
        </div>
      </div>

      {/* Safety Gate Alert (If Blocked - Hard Stop) */}
      {!isEligible && (
        <div className="p-6 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6 text-rose-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-900">FOOD SAFETY HARD-STOP: SALE STRICTLY PROHIBITED</h3>
              <p className="text-xs text-rose-700">Organizing Gate 1: Expired, damaged, or unresolved cold-chain stock cannot be approved for recovery.</p>
            </div>
          </div>

          <p className="text-xs text-rose-800 leading-relaxed bg-white/60 p-3.5 rounded-xl border border-rose-200">
            <strong>Blocking Reason:</strong> {activeBatch.expired
              ? `Batch ${activeBatch.id} is EXPIRED. Sellable quantity is forced to 0. Favorable profit margins (+₹${originalPrice - incrementalCost}/unit) can never override food safety.`
              : activeBatch.coldChainStatus === 'exception'
              ? `Batch ${activeBatch.id} has an UNRESOLVED COLD-CHAIN EXCEPTION. Sale held pending manager review.`
              : activeBatch.eligibility?.reason || 'Batch is blocked from sale under safety rules.'}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-mono font-bold text-rose-700">
              Sellable Qty: 0 units • Approved Contribution: ₹0
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Record Disposal / Quarantine Action
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Controls on Left, Live Outcome on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Markdown & Demand Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Markdown & Demand Controls</span>
              </h3>
              <button
                onClick={handleResetToStarting}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Starting Values</span>
              </button>
            </div>

            {/* Input 1: Proposed Selling Price & Markdown % (Dual Linked Controls) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="price-number-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Proposed Selling Price (INR ₹ per unit)</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Allowed range: ₹{minAllowedPrice} to ₹{originalPrice}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1 bg-slate-50">
                    <span className="text-xs font-bold text-slate-500 mr-1">₹</span>
                    <input
                      id="price-number-input"
                      type="number"
                      step="0.5"
                      disabled={!isEligible}
                      value={proposedPriceInput}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="w-20 text-right text-sm font-bold bg-transparent focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center border border-slate-200 rounded-xl px-2 py-1 bg-slate-50">
                    <input
                      id="markdown-percent-input"
                      type="number"
                      step="1"
                      disabled={!isEligible}
                      value={markdownPercentInput}
                      onChange={(e) => handleMarkdownPercentChange(e.target.value)}
                      className="w-12 text-right text-xs font-bold bg-transparent focus:outline-hidden"
                    />
                    <span className="text-xs font-bold text-slate-500 ml-1">% OFF</span>
                  </div>
                </div>
              </div>

              {/* Price Slider */}
              <input
                id="price-slider"
                type="range"
                min={minAllowedPrice}
                max={originalPrice}
                step={0.5}
                disabled={!isEligible}
                value={isNaN(numericPrice) ? originalPrice : Math.max(minAllowedPrice, Math.min(originalPrice, numericPrice))}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full accent-emerald-600 cursor-pointer disabled:opacity-50"
              />

              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Min Allowed: ₹{minAllowedPrice} ({maxAllowedMarkdownPercent}% cap)</span>
                <span>Incremental Cost: ₹{incrementalCost}</span>
                <span>Original: ₹{originalPrice}</span>
              </div>

              {/* Validation Warning Cards (Without Silent Clamping) */}
              {isPriceNegative && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Negative Price Rejected:</strong> Selling price cannot be negative.
                  </div>
                </div>
              )}

              {isPriceExceedingOriginal && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Price Exceeds Original:</strong> Proposed price ₹{numericPrice} exceeds original selling price of ₹{originalPrice}.
                  </div>
                </div>
              )}

              {isMarkdownExceedingLimit && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Markdown Limit Violated:</strong> Proposed price ₹{numericPrice} exceeds the maximum permitted markdown of {maxAllowedMarkdownPercent}% (Minimum allowed price is ₹{minAllowedPrice}).
                  </div>
                </div>
              )}

              {isPriceBelowCost && !isMarkdownExceedingLimit && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Below Incremental Cost:</strong> Proposed price ₹{numericPrice} is below recovery cost ₹{incrementalCost}. Contribution would be negative.
                  </div>
                </div>
              )}
            </div>

            {/* Input 2: Supported Demand Scenario (Mandated in Section 7) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="demand-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    <span>Demand Scenario (Units)</span>
                  </label>
                  <p className="text-[11px] text-slate-400">Supported evidence from fixture or manager estimate</p>
                </div>

                <input
                  id="demand-input"
                  type="number"
                  min="0"
                  step="1"
                  disabled={demandMode === 'MISSING' || !isEligible}
                  value={demandMode === 'MISSING' ? '' : demandInput}
                  onChange={(e) => {
                    setDemandInput(e.target.value);
                    setDemandMode('CUSTOM');
                  }}
                  className="w-20 px-3 py-1.5 text-right text-sm font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden disabled:opacity-40"
                />
              </div>

              {/* Demand Scenario Selector Radio Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDemandMode('FIXTURE');
                    setDemandInput(String(activeBatch.demandAssumption || 10));
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    demandMode === 'FIXTURE'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block opacity-70">Fixture Assumption</span>
                  <span className="text-xs font-extrabold block mt-0.5">{activeBatch.demandAssumption || 10} Units</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDemandMode('CUSTOM');
                    setDemandInput('15');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    demandMode === 'CUSTOM'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block opacity-70">High Scenario</span>
                  <span className="text-xs font-extrabold block mt-0.5">15 Units</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDemandMode('ZERO');
                    setDemandInput('0');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    demandMode === 'ZERO'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block opacity-70">Zero Demand</span>
                  <span className="text-xs font-extrabold block mt-0.5">0 Units</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDemandMode('MISSING');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    demandMode === 'MISSING'
                      ? 'bg-rose-900 text-white border-rose-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block opacity-70">Missing Evidence</span>
                  <span className="text-xs font-extrabold block mt-0.5">Unknown</span>
                </button>
              </div>

              {/* Demand Status Warning Note */}
              {demandMode === 'MISSING' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Missing Demand Evidence:</strong> In accordance with organizing rule 5.3, demand is held at 0 to prevent speculative waste. No units will be allocated.
                  </div>
                </div>
              )}

              {isDemandNegative && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Invalid Demand:</strong> Supported demand must be a non-negative integer.
                  </div>
                </div>
              )}
            </div>

            {/* Input 3: Store Minimum Contribution Margin Policy Floor */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                  <span>Store Contribution Floor Policy</span>
                </span>
                <p className="text-[11px] text-slate-400">Minimum required unit margin before operational approval</p>
              </div>

              <div className="flex items-center gap-2">
                {[0, 5, 10].map(threshold => (
                  <button
                    key={threshold}
                    type="button"
                    onClick={() => setMinContributionPolicy(threshold)}
                    className={`text-xs px-3 py-1 rounded-lg font-mono font-bold transition-colors cursor-pointer ${
                      minContributionPolicy === threshold
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ₹{threshold}/u
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Projected Outcome & Recommendations (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Projected Outcome Summary</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Shared Domain Engine
              </span>
            </div>

            {/* Total Recovery Contribution Hero Card */}
            <div className={`p-5 rounded-2xl border ${
              !isEligible
                ? 'bg-slate-100 border-slate-200 text-slate-700'
                : recommendation?.recommendedAction === ActionType.RECOMMEND_MARKDOWN_SALE
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <span className="text-xs font-semibold uppercase tracking-wider block opacity-75">
                Total Projected Contribution
              </span>
              <div className="text-3xl font-black mt-1">
                ₹{projectedContributionTotal}
              </div>
              <p className="text-xs mt-1 opacity-80">
                Formula: {projectedSold} units sold × ₹{unitContribution} unit contribution
              </p>
            </div>

            {/* Revenue & Cost Breakdown (Section 8 Mandate) */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-slate-400 font-medium block">Projected Revenue</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">₹{projectedRevenue}</span>
                <span className="text-[10px] text-slate-400">{projectedSold} × ₹{numericPrice || 0}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-slate-400 font-medium block">Incremental Cost (Sold)</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">₹{projectedIncrementalCostTotal}</span>
                <span className="text-[10px] text-slate-400">{projectedSold} × ₹{incrementalCost}</span>
              </div>
            </div>

            {/* Quantity Allocation Breakdown (Demand Capping Mandate) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block">Stock Allocation Balance</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                  <span className="text-emerald-800 font-medium block">Projected Units Sold</span>
                  <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                    {projectedSold} <span className="text-xs font-normal text-emerald-700">units</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">min(stock, demand)</span>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                  <span className="text-amber-800 font-medium block">Unsold Quantity</span>
                  <div className="text-lg font-extrabold text-amber-900 mt-0.5">
                    {unsoldQuantity} <span className="text-xs font-normal text-amber-700">units</span>
                  </div>
                  <span className="text-[10px] text-amber-700 block mt-0.5">visibly accounted for</span>
                </div>
              </div>

              {recommendation?.unmetDemand > 0 && (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center justify-between">
                  <span>Unmet Customer Demand:</span>
                  <span className="font-bold">{recommendation.unmetDemand} units</span>
                </div>
              )}
            </div>

            {/* Recommendation & Plain Language Explanation Card (Section 9 Mandate) */}
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              !isEligible
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : recommendation?.recommendedAction === ActionType.RECOMMEND_MARKDOWN_SALE
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                {isEligible ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertOctagon className="w-4 h-4 text-rose-600" />}
                <span>System Recommendation: {recommendation?.recommendedAction}</span>
              </div>
              <p className="leading-relaxed">
                {recommendation?.explanation}
              </p>
            </div>

            {/* Action Commitment Button */}
            <div className="pt-2">
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
