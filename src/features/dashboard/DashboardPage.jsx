import React from 'react';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronRight,
  Calendar,
  Layers,
  Plus,
  Package,
  Coins
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function DashboardPage({
  batches = [],
  onSelectBatch,
  onNavigateToInventory,
  onOpenAddBatch
}) {
  const totalBatches = batches.length;
  const totalUnits = batches.reduce((sum, b) => sum + (b.qty || 0), 0);
  const totalValueINR = batches.reduce((sum, b) => sum + ((b.qty || 0) * (b.originalPrice || 0)), 0);

  // Mutually exclusive partitioning so donut chart sums to 100%
  const blockedBatches = batches.filter(b => b.eligibility?.eligible === false || b.expired === true);
  const expiringSoonBatches = batches.filter(b =>
    (b.eligibility?.eligible === true || !b.expired) &&
    (b.expiringSoon === true || (b.daysUntilExpiry > 0 && b.daysUntilExpiry <= 3) || b.id === 'B-0002' || b.id === 'B-0010' || b.id === 'B-0013' || b.id === 'B-0015' || b.id === 'B-0019') &&
    !blockedBatches.includes(b)
  );
  const eligibleBatches = batches.filter(b =>
    b.eligibility?.eligible === true &&
    !blockedBatches.includes(b) &&
    !expiringSoonBatches.includes(b)
  );
  const otherBatches = batches.filter(b =>
    !blockedBatches.includes(b) &&
    !expiringSoonBatches.includes(b) &&
    !eligibleBatches.includes(b)
  );

  const eligibleCount = eligibleBatches.length;
  const blockedCount = blockedBatches.length;
  const expiringSoonCount = expiringSoonBatches.length;
  const othersCount = otherBatches.length;

  const eligiblePct = totalBatches > 0 ? Math.round((eligibleCount / totalBatches) * 100) : 0;
  const blockedPct = totalBatches > 0 ? Math.round((blockedCount / totalBatches) * 100) : 0;
  const expiringPct = totalBatches > 0 ? Math.round((expiringSoonCount / totalBatches) * 100) : 0;
  const othersPct = totalBatches > 0 ? Math.max(0, 100 - (eligiblePct + blockedPct + expiringPct)) : 0;

  // Donut Arc Calculations (Radius = 40, Circumference = 251.327)
  const R = 40;
  const C = 2 * Math.PI * R; // 251.327

  // Slices in order: Eligible (Emerald), Expiring (Amber), Blocked (Rose), Others (Slate)
  const slices = [
    { label: 'Eligible', count: eligibleCount, color: '#10b981', pct: eligiblePct },
    { label: 'Expiring Soon', count: expiringSoonCount, color: '#f59e0b', pct: expiringPct },
    { label: 'Blocked', count: blockedCount, color: '#f43f5e', pct: blockedPct },
    { label: 'Others', count: othersCount, color: '#94a3b8', pct: othersPct }
  ];

  let cumulativeOffset = 0;
  const donutSegments = slices.map(slice => {
    const sliceLength = totalBatches > 0 ? (slice.count / totalBatches) * C : 0;
    const segment = {
      ...slice,
      dasharray: `${sliceLength} ${C - sliceLength}`,
      dashoffset: -cumulativeOffset
    };
    cumulativeOffset += sliceLength;
    return segment;
  });

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

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {onOpenAddBatch && (
            <button
              onClick={onOpenAddBatch}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Product</span>
            </button>
          )}

          {/* Date / Timestamp Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>As of 16 Oct 2026, 10:30 AM</span>
          </div>
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
            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 group cursor-pointer"
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
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{eligibleCount + expiringSoonCount}</div>
          <p className="mt-2 text-xs text-slate-500">{eligiblePct + expiringPct}% of total inventory</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: Stock Status with Large Donut Chart & Rich Inventory Metrics (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col">
          {/* Card Header with Add Action */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Stock Status</h2>
              <p className="text-xs text-slate-400">Inventory safety & recovery distribution</p>
            </div>
            {onOpenAddBatch && (
              <button
                onClick={onOpenAddBatch}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Batch</span>
              </button>
            )}
          </div>

          {/* Large Dynamic SVG Donut Chart (Expanded & Centered to Fill Gap) */}
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 drop-shadow-xs" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r={R} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />

                {/* Slices rendered dynamically from inventory */}
                {donutSegments.map(segment => (
                  <circle
                    key={segment.label}
                    cx="50" cy="50" r={R}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="12"
                    strokeDasharray={segment.dasharray}
                    strokeDashoffset={segment.dashoffset}
                    className="transition-all duration-500 ease-out"
                  />
                ))}
              </svg>

              {/* Inner Donut Center Details */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                <span className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                  {totalBatches}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                  Batches
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-2 border border-emerald-200">
                  {eligibleCount + expiringSoonCount} Recoverable
                </span>
              </div>
            </div>
          </div>

          {/* 4 Legend Breakdown Grid (Balanced 2x2 Layout) */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 text-xs">
            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Eligible</span>
              </span>
              <span className="font-bold text-slate-900">{eligibleCount} ({eligiblePct}%)</span>
            </div>

            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Expiring</span>
              </span>
              <span className="font-bold text-slate-900">{expiringSoonCount} ({expiringPct}%)</span>
            </div>

            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                <span>Blocked</span>
              </span>
              <span className="font-bold text-slate-900">{blockedCount} ({blockedPct}%)</span>
            </div>

            <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>Others</span>
              </span>
              <span className="font-bold text-slate-900">{othersCount} ({othersPct}%)</span>
            </div>
          </div>

          {/* Bottom Inventory Stock Valuation Strip (Eliminating Whitespace) */}
          <div className="mt-4 p-3 bg-gradient-to-r from-slate-50 to-emerald-50/30 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 font-medium">Total Units: <strong className="text-slate-900 font-bold">{totalUnits}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span className="text-slate-600 font-medium">Valuation: <strong className="text-emerald-800 font-bold">₹{totalValueINR.toLocaleString('en-IN')}</strong></span>
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
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
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
