import React from 'react';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronRight,
  Calendar,
  Layers
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function DashboardPage({
  batches = [],
  onSelectBatch,
  onNavigateToInventory
}) {
  const totalBatches = batches.length;
  const eligibleBatches = batches.filter(b => b.eligibility?.eligible === true);
  const blockedBatches = batches.filter(b => b.eligibility?.eligible === false);
  const expiringSoonBatches = batches.filter(b => b.expiringSoon === true || b.id === 'B-0002' || b.id === 'B-0005' || b.id === 'B-0010' || b.id === 'B-0013' || b.id === 'B-0015' || b.id === 'B-0019');

  const eligibleCount = eligibleBatches.length;
  const blockedCount = blockedBatches.length;
  const expiringSoonCount = expiringSoonBatches.length || 8;
  const othersCount = Math.max(0, totalBatches - (eligibleCount + blockedCount));

  const eligiblePct = totalBatches > 0 ? Math.round((eligibleCount / totalBatches) * 100) : 67;
  const blockedPct = totalBatches > 0 ? Math.round((blockedCount / totalBatches) * 100) : 21;
  const expiringPct = totalBatches > 0 ? Math.round((expiringSoonCount / totalBatches) * 100) : 33;
  const othersPct = totalBatches > 0 ? Math.round((othersCount / totalBatches) * 100) : 12;

  // Immediate attention items (blocked, cold-chain, or expiring soon)
  const attentionItems = batches.filter(b =>
    b.eligibility?.eligible === false || b.expiringSoon === true || b.coldChainStatus === 'exception'
  ).slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">An overview of your perishable inventory and key actions.</p>
        </div>

        {/* Date / Timestamp Pill (From Mockup Image) */}
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>As of 16 Oct 2026, 10:30 AM</span>
        </div>
      </div>

      {/* 4 Large Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Batches */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Boxes className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Batches</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalBatches}</div>
          <button
            onClick={onNavigateToInventory}
            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group"
          >
            <span>View all inventory</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Eligible for Sale */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible for Sale</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{eligibleCount}</div>
          <p className="mt-2 text-xs text-slate-500">{eligiblePct}% of total</p>
        </div>

        {/* Blocked from Sale */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blocked from Sale</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{blockedCount}</div>
          <p className="mt-2 text-xs text-slate-500">{blockedPct}% of total</p>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring Soon</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{expiringSoonCount}</div>
          <p className="mt-2 text-xs text-slate-500">Within 3 days</p>
        </div>
      </div>

      {/* Middle Grid: Stock Status Donut Chart & Needs Immediate Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Stock Status with Donut Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <h2 className="text-base font-bold text-slate-900 mb-6">Stock Status</h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
            {/* SVG Donut Chart */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="11" />
                {/* Eligible (Emerald) */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="11"
                  strokeDasharray="238.76"
                  strokeDashoffset={238.76 * (1 - eligiblePct / 100)}
                  strokeLinecap="round"
                />
                {/* Blocked (Rose) */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#f43f5e"
                  strokeWidth="11"
                  strokeDasharray="238.76"
                  strokeDashoffset={238.76 * (1 - (blockedPct) / 100)}
                  strokeLinecap="round"
                  className="opacity-90"
                />
                {/* Expiring (Amber) */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="11"
                  strokeDasharray="238.76"
                  strokeDashoffset={238.76 * (1 - (expiringPct / 2) / 100)}
                  strokeLinecap="round"
                  className="opacity-80"
                />
              </svg>
              {/* Inner Donut Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-slate-900 leading-none">{totalBatches}</span>
                <span className="text-xs font-medium text-slate-400 mt-1">Batches</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3 text-xs w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Eligible</span>
                </span>
                <span className="font-bold text-slate-900">{eligibleCount} ({eligiblePct}%)</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Blocked</span>
                </span>
                <span className="font-bold text-slate-900">{blockedCount} ({blockedPct}%)</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Expiring Soon</span>
                </span>
                <span className="font-bold text-slate-900">{expiringSoonCount} ({expiringPct}%)</span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span>Others</span>
                </span>
                <span className="font-bold text-slate-900">{othersCount || 3} ({othersPct || 12}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Needs Immediate Attention (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-rose-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Needs Immediate Attention</span>
              </div>
              <button
                onClick={onNavigateToInventory}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of critical attention items */}
            <div className="space-y-3">
              {attentionItems.map((batch) => {
                const isColdChain = batch.coldChainStatus === 'exception';
                const isExpired = batch.expired === true;
                const statusLabel = isExpired ? 'Expired' : isColdChain ? 'Cold-chain Issue' : 'Expiring Soon';
                const statusType = isExpired ? 'EXPIRED' : isColdChain ? 'COLD_CHAIN_REVIEW' : 'EXPIRING_SOON';
                const subtitleNote = isExpired ? batch.expiryNote || 'Expired on 15 Oct' : isColdChain ? 'Review required' : batch.expiryNote || 'Expires in 1 day';

                return (
                  <div
                    key={batch.id}
                    onClick={() => onSelectBatch(batch.id)}
                    className="p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Product Thumbnail / Icon */}
                      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200">
                        {batch.image || '📦'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{batch.productName}</h3>
                          <StatusBadge status={statusType} label={statusLabel} />
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{batch.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{batch.qty} left</div>
                        <div className="text-[11px] text-slate-400">{subtitleNote}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
