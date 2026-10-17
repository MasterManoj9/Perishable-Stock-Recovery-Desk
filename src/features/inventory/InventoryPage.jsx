import React, { useState, useMemo } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { InventoryTable } from './InventoryTable.jsx';
import { BatchDetails } from './BatchDetails.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';

export function InventoryPage({
  batches = [],
  selectedBatchId = null,
  onSelectBatch,
  globalSearchQuery = '',
  onOpenSimulator
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState('ALL');

  // Multi-facet filtering logic
  const filteredBatches = useMemo(() => {
    let result = [...batches];

    // Global search query
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.toLowerCase().trim();
      result = result.filter(b =>
        b.id.toLowerCase().includes(q) ||
        (b.productName && b.productName.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter === 'ELIGIBLE') {
      result = result.filter(b => b.eligibility?.eligible === true);
    } else if (statusFilter === 'EXPIRED') {
      result = result.filter(b => b.expired === true);
    } else if (statusFilter === 'EXPIRING_SOON') {
      result = result.filter(b => b.expiringSoon === true);
    } else if (statusFilter === 'COLD_CHAIN') {
      result = result.filter(b => b.coldChainStatus === 'exception');
    }

    // Product Category filter
    if (productFilter !== 'ALL') {
      result = result.filter(b => b.category?.toLowerCase() === productFilter.toLowerCase());
    }

    // Expiry category filter
    if (expiryFilter === 'EXPIRED') {
      result = result.filter(b => b.expired === true);
    } else if (expiryFilter === 'SOON') {
      result = result.filter(b => b.expiringSoon === true);
    }

    return result;
  }, [batches, globalSearchQuery, statusFilter, productFilter, expiryFilter]);

  const hasActiveFilters = statusFilter !== 'ALL' || productFilter !== 'ALL' || expiryFilter !== 'ALL' || globalSearchQuery.trim() !== '';

  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setProductFilter('ALL');
    setExpiryFilter('ALL');
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId) || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inventory</h1>
        <p className="text-sm text-slate-500 mt-1">View and manage all batches. Select a batch to see details and simulate markdowns.</p>
      </div>

      {/* Filter Bar (From Mockup Image) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          aria-label="Filter by Status"
        >
          <option value="ALL">All Status</option>
          <option value="ELIGIBLE">Eligible</option>
          <option value="EXPIRING_SOON">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
          <option value="COLD_CHAIN">Cold-chain Issue</option>
        </select>

        {/* Product Category Filter */}
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          aria-label="Filter by Product Category"
        >
          <option value="ALL">All Products</option>
          <option value="Dairy">Dairy</option>
          <option value="Bakery">Bakery</option>
          <option value="Produce">Produce</option>
          <option value="Meat">Meat</option>
          <option value="Beverage">Beverage</option>
        </select>

        {/* Expiry Category Filter */}
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value)}
          className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          aria-label="Filter by Expiry Range"
        >
          <option value="ALL">All Expiry</option>
          <option value="SOON">Within 3 Days</option>
          <option value="EXPIRED">Expired</option>
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      {filteredBatches.length === 0 ? (
        <EmptyState
          title="No batches found"
          description="Try adjusting your status or product category filter."
          action={
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <InventoryTable
          batches={filteredBatches}
          selectedBatchId={selectedBatchId}
          onSelectBatch={onSelectBatch}
        />
      )}

      {/* Batch Details Modal (Matching Mockup Image Bottom-Right) */}
      {selectedBatch && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) onSelectBatch(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-xs animate-fadeIn"
        >
          <div className="w-full max-w-3xl">
            <BatchDetails
              batch={selectedBatch}
              onClose={() => onSelectBatch(null)}
              onViewInInventory={() => onSelectBatch(null)}
              onAction={(b) => {
                onSelectBatch(null);
                if (onOpenSimulator) onOpenSimulator(b);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
