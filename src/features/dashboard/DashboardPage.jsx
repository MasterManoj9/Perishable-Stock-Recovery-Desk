import React, { useMemo, useState } from 'react';
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
  Coins,
  FileSpreadsheet,
  Heart,
  TrendingDown,
  Sliders
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { OrphanageDonationModal } from './OrphanageDonationModal.jsx';
import { AdjustDiscountModal } from './AdjustDiscountModal.jsx';

export function DashboardPage({
  batches = [],
  onSelectBatch,
  onNavigateToInventory,
  onOpenAddBatch,
  onOpenBulkUpload,
  onUpdateBatch,
  onRefresh
}) {
  const totalBatches = batches.length;
  const totalUnits = batches.reduce((sum, b) => sum + (b.qty || 0), 0);
  const totalValueINR = batches.reduce((sum, b) => sum + ((b.qty || 0) * (b.originalPrice || 0)), 0);

  // Mutually exclusive partitioning so donut chart sums to 100%
  const blockedBatches = batches.filter(b => b.eligibility?.eligible === false || b.expired === true);
  const expiringSoonBatches = batches.filter(b =>
    (b.eligibility?.eligible === true || !b.expired) &&
    (b.expiringSoon === true || (b.daysUntilExpiry > 0 && b.daysUntilExpiry <= 3)) &&
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

  const [activeSection, setActiveSection] = useState('expiring'); // 'expiring' | 'low_sale'
  const [donatingBatch, setDonatingBatch] = useState(null);
  const [discountingBatch, setDiscountingBatch] = useState(null);

  // Section 1: Expiring within 3 days
  const expiringSoonItems = useMemo(() => {
    return batches.filter(b => {
      const days = b.daysUntilExpiry !== undefined ? Number(b.daysUntilExpiry) : null;
      const isSoon = b.expiringSoon === true || (days !== null && days <= 3 && days >= 0) || (b.expiryAt && (new Date(b.expiryAt).getTime() - Date.now() <= 3 * 86400000 && new Date(b.expiryAt).getTime() >= Date.now()));
      return isSoon && !b.expired && b.condition !== 'damaged' && (b.qty || 0) > 0;
    });
  }, [batches]);

  // Section 2: Low sale rate / slow moving
  const lowSaleRateItems = useMemo(() => {
    return batches.filter(b => {
      const qty = Number(b.qty || 0);
      const demand = Number(b.demandAssumptionUnits || b.demandAssumption || 0);
      const isLowDemand = (demand > 0 && demand < qty) || b.demandEvidence === 'None' || b.demandEvidence === 'Available (Low)';
      const isSlowMoving = qty >= 10 && (!b.salesVelocity || b.salesVelocity === 'slow' || b.turnoverRate < 0.4);
      return (isLowDemand || isSlowMoving) && !b.expired && b.condition !== 'damaged' && qty > 0;
    });
  }, [batches]);

  // Immediate attention items (kept for backward compatibility)
  const attentionItems = batches.filter(b =>
    b.eligibility?.eligible === false || b.expiringSoon === true || b.coldChainStatus === 'exception'
  ).slice(0, 5);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  if (totalBatches === 0) {
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#302722] tracking-tight">Dashboard</h1>
            <p className="text-sm text-[#76675F] mt-1">An overview of your perishable inventory and key actions.</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenBulkUpload && (
              <button
                onClick={onOpenBulkUpload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs transition-colors cursor-pointer"
                title="Upload multiple products via CSV file"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Bulk Add (CSV)</span>
              </button>
            )}
            {onOpenAddBatch && (
              <button
                onClick={onOpenAddBatch}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#302722] hover:bg-black text-white shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Add Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State Card */}
        <div className="bg-white rounded-2xl border border-[#EEDDD2] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF8F3] border border-[#EEDDD2] flex items-center justify-center mx-auto mb-4 text-[#D97757]">
            <Boxes className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#302722] mb-1">No products added yet</h2>
          <p className="text-xs text-[#76675F] max-w-md mx-auto mb-6">
            Get started by recording a perishable inventory item with its expiry timeline, quantity, and cost to enable markdown recovery and intelligent forecasting.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {onOpenBulkUpload && (
              <button
                onClick={onOpenBulkUpload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Bulk Add (CSV)</span>
              </button>
            )}
            {onOpenAddBatch && (
              <button
                onClick={onOpenAddBatch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#D97757] hover:bg-[#c66545] text-white shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Product</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#302722] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#76675F] mt-1">An overview of your perishable inventory and key actions.</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {onOpenBulkUpload && (
            <button
              onClick={onOpenBulkUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs transition-colors cursor-pointer"
              title="Upload multiple products via CSV file"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Bulk Add (CSV)</span>
            </button>
          )}

          {onOpenAddBatch && (
            <button
              onClick={onOpenAddBatch}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#302722] hover:bg-black text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Product</span>
            </button>
          )}

          {/* Date / Timestamp Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#EEDDD2] text-xs font-medium text-[#76675F] shadow-xs">
            <Calendar className="w-4 h-4 text-[#76675F]" />
            <span>As of {formattedDate}</span>
          </div>
        </div>
      </div>


      {/* 4 Large Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Batches */}
        <div
          onClick={onNavigateToInventory}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Batches</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{totalBatches}</div>
          <p className="mt-2 text-xs font-semibold text-blue-600 inline-flex items-center gap-1">
            <span>View all inventory</span>
          </p>
        </div>

        {/* Eligible for Sale */}
        <div
          onClick={onNavigateToInventory}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eligible for Sale</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{eligibleCount + expiringSoonCount}</div>
          <p className="mt-2 text-xs text-slate-500">{eligiblePct + expiringPct}% of total inventory</p>
        </div>

        {/* Blocked from Sale */}
        <div
          onClick={onNavigateToInventory}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blocked from Sale</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{blockedCount}</div>
          <p className="mt-2 text-xs text-slate-500">{blockedPct}% of total</p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={onNavigateToInventory}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
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

        {/* Right Card: Needs Immediate Action (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-rose-100 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Needs Immediate Action</span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  {expiringSoonItems.length + lowSaleRateItems.length} items
                </span>
              </div>
              <button
                onClick={onNavigateToInventory}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all in Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2 Navigation Section Tabs: "expires within 3 days" & "low sale rate" */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setActiveSection('expiring')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeSection === 'expiring'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Expiring within 3 Days</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeSection === 'expiring' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {expiringSoonItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('low_sale')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeSection === 'low_sale'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                <span>Low Sale Rate</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeSection === 'low_sale' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {lowSaleRateItems.length}
                </span>
              </button>
            </div>

            {/* List of items */}
            {((activeSection === 'expiring' ? expiringSoonItems : lowSaleRateItems).length === 0) ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No items requiring action in this category</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All stock in this section is currently safe and performing well.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(activeSection === 'expiring' ? expiringSoonItems : lowSaleRateItems).slice(0, 5).map((batch) => {
                  const daysLeft = batch.daysUntilExpiry !== undefined ? batch.daysUntilExpiry : null;
                  const expiryNote = daysLeft !== null ? (daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`) : (batch.expiryNote || 'Near expiry');
                  const isLowDemand = (Number(batch.demandAssumptionUnits || batch.demandAssumption || 0) < Number(batch.qty || 0));
                  const subtitleNote = activeSection === 'expiring'
                    ? expiryNote
                    : (isLowDemand ? `Low demand velocity • ${batch.qty} in stock` : `Slow turnover • ₹${batch.originalPrice} MRP`);

                  return (
                    <div
                      key={batch.id}
                      onClick={() => onSelectBatch && onSelectBatch(batch.id)}
                      className="p-3.5 rounded-xl hover:bg-slate-50/90 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-3 cursor-pointer border border-slate-100 hover:border-slate-300 shadow-2xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Product Thumbnail */}
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0 border border-slate-200 overflow-hidden">
                          {batch.imageUrl ? (
                            <img src={batch.imageUrl} alt={batch.productName} className="w-full h-full object-cover" />
                          ) : (
                            batch.image || '📦'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{batch.productName}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              activeSection === 'expiring'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {activeSection === 'expiring' ? 'Near Expiry' : 'Low Velocity'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {batch.id} • <span className="font-sans text-slate-700 font-semibold">{batch.qty} units</span> • {subtitleNote}
                          </p>
                        </div>
                      </div>

                      {/* 2 Dedicated Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 justify-end" onClick={(e) => e.stopPropagation()}>
                        {/* Action 1: Donate to Orphans */}
                        <button
                          type="button"
                          onClick={() => setDonatingBatch(batch)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Donate stock to partner orphanages"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                          <span>Donate to Orphans</span>
                        </button>

                        {/* Action 2: Keep More Discount */}
                        <button
                          type="button"
                          onClick={() => setDiscountingBatch(batch)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Adjust discount clearance bar"
                        >
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Keep More Discount</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. Donate to Orphans Modal */}
      <OrphanageDonationModal
        isOpen={Boolean(donatingBatch)}
        onClose={() => setDonatingBatch(null)}
        batch={donatingBatch}
        onConfirmDonation={async (batch, qty, loc) => {
          if (onUpdateBatch) {
            const remaining = Math.max(0, (batch.qty || 0) - qty);
            await onUpdateBatch({
              ...batch,
              qty: remaining,
              available_quantity: remaining,
              condition: remaining === 0 ? 'donated' : batch.condition
            });
          }
          if (onRefresh) onRefresh();
        }}
      />

      {/* 2. Keep More Discount Modal */}
      <AdjustDiscountModal
        isOpen={Boolean(discountingBatch)}
        onClose={() => setDiscountingBatch(null)}
        batch={discountingBatch}
        onApplyDiscount={async (updatedBatch) => {
          if (onUpdateBatch) {
            await onUpdateBatch(updatedBatch);
          }
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
