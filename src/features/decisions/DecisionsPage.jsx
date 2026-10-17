import React, { useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  Coins,
  Eye,
  Info
} from 'lucide-react';
import { generateDecisionsCsv, downloadFile } from '../../data/decisionStore.js';
import { EmptyState } from '../../components/EmptyState.jsx';
import { DecisionDetailModal } from './DecisionDetailModal.jsx';

export function DecisionsPage({
  decisions = [],
  liveBatches = [],
  onClearDecisions,
  onNavigateToSimulator,
  onNavigateToInventory
}) {
  const [selectedDecision, setSelectedDecision] = useState(null);

  // Compute summary stats with clear projection semantics
  const totalDecisions = decisions.length;
  const totalProjectedRecoveryINR = decisions.reduce((acc, d) => {
    const val = d.calculatedOutcome?.projectedContribution !== undefined
      ? d.calculatedOutcome.projectedContribution
      : (d.totalContribution || 0);
    return acc + val;
  }, 0);

  const totalProjectedSoldUnits = decisions.reduce((acc, d) => {
    const val = d.calculatedOutcome?.projectedQuantitySold !== undefined
      ? d.calculatedOutcome.projectedQuantitySold
      : (d.allocatedQuantity || 0);
    return acc + val;
  }, 0);

  const totalProjectedUnsoldUnits = decisions.reduce((acc, d) => {
    const val = d.calculatedOutcome?.projectedUnsoldQuantity !== undefined
      ? d.calculatedOutcome.projectedUnsoldQuantity
      : (d.unsoldQuantity || 0);
    return acc + val;
  }, 0);

  const handleExportCsv = () => {
    const csvContent = generateDecisionsCsv(decisions);
    downloadFile(csvContent, `fynd_c30_decisions_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJson = () => {
    const jsonContent = JSON.stringify({
      case_id: 'C30',
      exported_at: new Date().toISOString(),
      schema_version: '1.0.0',
      synthetic: true,
      evidence_disclaimer: 'Synthetic simulation data. Captures recorded scenario decisions under modeled demand assumptions. Not proof of actual customer transactions, realized revenue, or verified waste reduction.',
      decisions_count: decisions.length,
      decisions
    }, null, 2);
    downloadFile(jsonContent, `fynd_c30_decisions_${Date.now()}.json`, 'application/json');
  };

  const getStatusBadge = (decision) => {
    const status = decision.decisionStatus || decision.actionType || decision.calculatedOutcome?.actionType;
    const isSale = status === 'APPROVED_MARKDOWN' || status === 'RECOMMEND_MARKDOWN_SALE';
    const isColdChain = status === 'BLOCKED_REVIEW' || status === 'BLOCK_SALE_REVIEW';
    const isExpiredOrBlocked = status === 'BLOCKED_DISPOSAL' || status === 'BLOCK_SALE_DISPOSAL';

    if (isSale) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Approved Markdown</span>
        </span>
      );
    }

    if (isColdChain) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>Blocked: Review</span>
        </span>
      );
    }

    if (isExpiredOrBlocked) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertOctagon className="w-3 h-3 text-rose-500" />
          <span>Blocked: Disposal</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <span>{status || 'Recorded'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Decisions History</h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable audit trail of manager actions, markdown decisions, and stock disposals.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            disabled={decisions.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV (RFC 4180)</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={decisions.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Export JSON</span>
          </button>

          {decisions.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear decision history? This will remove all locally stored audit records.')) {
                  onClearDecisions();
                }
              }}
              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Clear Decision History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Audit & Projection Disclaimer Banner */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Audit Discipline Note:</strong> Every record represents a manager's chosen scenario and the domain engine's projected calculation at that specific time. Recorded figures represent modeled projections under assumed demand, not proof of live point-of-sale transactions or verified waste reduction.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Decisions</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalDecisions}</div>
          <p className="text-xs text-slate-500 mt-1">Logged audit records</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Recovery (Total)</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">₹{totalProjectedRecoveryINR}</div>
          <p className="text-xs text-slate-500 mt-1">Modeled contribution sum</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Units Sold</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalProjectedSoldUnits}</div>
          <p className="text-xs text-slate-500 mt-1">Demand-capped units</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Unsold Stock</span>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{totalProjectedUnsoldUnits}</div>
          <p className="text-xs text-slate-500 mt-1">Units remaining in holding</p>
        </div>
      </div>

      {/* Main Decisions Table */}
      {decisions.length === 0 ? (
        <EmptyState
          title="No decisions recorded yet"
          description="Use the Markdown Simulator to simulate prices, allocate demand, and commit decisions to the audit log."
          action={
            <button
              onClick={onNavigateToSimulator}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Open Simulator
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 font-semibold border-b border-slate-100 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Decision ID & Time</th>
                  <th className="py-3.5 px-4">Batch & Product</th>
                  <th className="py-3.5 px-4">Decision Status</th>
                  <th className="py-3.5 px-4">Price & Cost</th>
                  <th className="py-3.5 px-4">Projected Sold</th>
                  <th className="py-3.5 px-4">Unsold</th>
                  <th className="py-3.5 px-4 text-right">Projected Contribution</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decisions.map((d) => {
                  const batch = d.batchSnapshot || {};
                  const scenario = d.scenarioSnapshot || {};
                  const outcome = d.calculatedOutcome || {};

                  const batchId = batch.batchId || d.batchId;
                  const productName = batch.productName || d.productName;
                  const proposedPrice = scenario.proposedSellingPrice !== undefined ? scenario.proposedSellingPrice : d.proposedPrice;
                  const cost = batch.incrementalCostPerUnit !== undefined ? batch.incrementalCostPerUnit : d.incrementalCost;
                  const unitContrib = outcome.unitContribution !== undefined ? outcome.unitContribution : d.unitContribution;
                  const sold = outcome.projectedQuantitySold !== undefined ? outcome.projectedQuantitySold : d.allocatedQuantity;
                  const unsold = outcome.projectedUnsoldQuantity !== undefined ? outcome.projectedUnsoldQuantity : d.unsoldQuantity;
                  const totalContrib = outcome.projectedContribution !== undefined ? outcome.projectedContribution : d.totalContribution;

                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDecision(d)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                          <span>{d.id}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {d.savedAtFormatted || d.timestampFormatted || d.savedAt?.slice(0, 16).replace('T', ' ') || d.timestamp?.slice(0, 16).replace('T', ' ')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="font-bold">{productName}</div>
                        <div className="text-[11px] font-mono text-slate-400">Batch: {batchId}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(d)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div>₹{proposedPrice} <span className="text-slate-400 text-[10px]">(Cost: ₹{cost})</span></div>
                        <div className="text-[10px] text-emerald-600 font-bold">+₹{unitContrib}/u margin</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {sold} <span className="font-normal text-slate-400">units</span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-amber-700">
                        {unsold} <span className="font-normal text-amber-600">units</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 text-sm">
                        ₹{totalContrib}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDecision(d);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision Detail Read-Only Modal */}
      {selectedDecision && (
        <DecisionDetailModal
          decision={selectedDecision}
          liveBatches={liveBatches}
          onClose={() => setSelectedDecision(null)}
          onNavigateToInventory={onNavigateToInventory}
        />
      )}
    </div>
  );
}
