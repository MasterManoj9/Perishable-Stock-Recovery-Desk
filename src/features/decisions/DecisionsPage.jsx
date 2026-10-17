import React, { useState } from 'react';
import {
  FileText,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  Coins
} from 'lucide-react';
import { generateDecisionsCsv, downloadFile } from '../../data/decisionStore.js';
import { EmptyState } from '../../components/EmptyState.jsx';

export function DecisionsPage({
  decisions = [],
  onClearDecisions,
  onNavigateToSimulator
}) {
  const [copiedId, setCopiedId] = useState(null);

  // Compute audit summary
  const totalDecisions = decisions.length;
  const totalRecoveredINR = decisions.reduce((acc, d) => acc + (d.totalContribution || 0), 0);
  const totalAllocatedUnits = decisions.reduce((acc, d) => acc + (d.allocatedQuantity || 0), 0);
  const totalUnsoldUnits = decisions.reduce((acc, d) => acc + (d.unsoldQuantity || 0), 0);

  const handleExportCsv = () => {
    const csvContent = generateDecisionsCsv(decisions);
    downloadFile(csvContent, `fynd_c30_decisions_${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJson = () => {
    const jsonContent = JSON.stringify({
      case_id: 'C30',
      exported_at: new Date().toISOString(),
      synthetic: true,
      evidence_disclaimer: 'Synthetic simulation data. Demonstrates software decision logging behavior only.',
      decisions
    }, null, 2);
    downloadFile(jsonContent, `fynd_c30_decisions_${Date.now()}.json`, 'application/json');
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
                if (window.confirm('Are you sure you want to clear decision history?')) {
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

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Decisions</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalDecisions}</div>
          <p className="text-xs text-slate-500 mt-1">Logged actions</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Recovery</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">₹{totalRecoveredINR}</div>
          <p className="text-xs text-slate-500 mt-1">Approved total contribution</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Allocated Quantity</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalAllocatedUnits}</div>
          <p className="text-xs text-slate-500 mt-1">Units saved for recovery</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unsold Stock</span>
          <div className="text-3xl font-extrabold text-amber-600 mt-1">{totalUnsoldUnits}</div>
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
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white cursor-pointer"
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
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Batch & Product</th>
                  <th className="py-3.5 px-4">Action Chosen</th>
                  <th className="py-3.5 px-4">Price & Cost</th>
                  <th className="py-3.5 px-4">Allocation</th>
                  <th className="py-3.5 px-4">Unsold</th>
                  <th className="py-3.5 px-4 text-right">Contribution</th>
                  <th className="py-3.5 px-4">Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {decisions.map((d) => {
                  const isSale = d.actionType === 'RECOMMEND_MARKDOWN_SALE';
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {d.timestampFormatted || d.timestamp?.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="font-bold">{d.productName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{d.batchId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isSale
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isSale ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          <span>{isSale ? 'Markdown Sale' : 'Quarantine / Disposed'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div>₹{d.proposedPrice} <span className="text-slate-400 text-[10px]">(Cost: ₹{d.incrementalCost})</span></div>
                        <div className="text-[10px] text-emerald-600 font-bold">+₹{d.unitContribution}/u</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {d.allocatedQuantity} <span className="font-normal text-slate-400">units</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-700">
                        {d.unsoldQuantity} <span className="font-normal text-amber-600">units</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700 text-sm">
                        ₹{d.totalContribution}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {d.managerName || 'Demo Manager'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
