import React, { useState, useMemo, useEffect } from 'react';
import { Filter, RotateCcw, Plus, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { InventoryTable } from './InventoryTable.jsx';
import { BatchDetails } from './BatchDetails.jsx';
import { DeleteProductModal } from './DeleteProductModal.jsx';
import { EditBatchModal } from './EditBatchModal.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { classifyExpiry, isSaleable } from '../../domain/eligibility.js';

const ITEMS_PER_PAGE = 10;

export function InventoryPage({
  batches = [],
  selectedBatchId = null,
  onSelectBatch,
  globalSearchQuery = '',
  onOpenSimulator,
  onOpenAddBatch,
  onOpenBulkUpload,
  onEditBatch,
  onUpdateBatch,
  onDeleteBatch
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [expiryFilter, setExpiryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [batchToEdit, setBatchToEdit] = useState(null);

  // Reset to page 1 whenever search, filters, or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, productFilter, expiryFilter, globalSearchQuery]);

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
    if (statusFilter === 'FRESH') {
      result = result.filter(b => classifyExpiry(b).status === 'FRESH');
    } else if (statusFilter === 'NEAR_EXPIRY') {
      result = result.filter(b => classifyExpiry(b).status === 'NEAR_EXPIRY');
    } else if (statusFilter === 'EXPIRED') {
      result = result.filter(b => classifyExpiry(b).status === 'EXPIRED');
    } else if (statusFilter === 'COLD_CHAIN') {
      result = result.filter(b => b.coldChainStatus === 'exception' || b.cold_chain_status === 'exception');
    } else if (statusFilter === 'ELIGIBLE') {
      result = result.filter(b => isSaleable(b).saleable === true);
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

  // Pagination bounds and calculations
  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / ITEMS_PER_PAGE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredBatches.length);

  const paginatedBatches = useMemo(() => {
    return filteredBatches.slice(startIndex, endIndex);
  }, [filteredBatches, startIndex, endIndex]);

  const hasActiveFilters = statusFilter !== 'ALL' || productFilter !== 'ALL' || expiryFilter !== 'ALL' || globalSearchQuery.trim() !== '';

  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setProductFilter('ALL');
    setExpiryFilter('ALL');
    setCurrentPage(1);
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId) || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#302722] tracking-tight">Inventory</h1>
          <p className="text-sm text-[#76675F] mt-1">View and manage all batches. Select a batch to see details and simulate markdowns.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenBulkUpload && (
            <button
              onClick={onOpenBulkUpload}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs transition-colors cursor-pointer"
              title="Upload products via CSV file"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Bulk Add (CSV)</span>
            </button>
          )}

          {onOpenAddBatch && (
            <button
              onClick={onOpenAddBatch}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#302722] hover:bg-black text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Product to Inventory</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-semibold bg-white border border-[#EEDDD2] rounded-xl px-3.5 py-2 text-[#302722] shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
          aria-label="Filter by Status"
        >
          <option value="ALL">All Status</option>
          <option value="FRESH">Fresh (Green)</option>
          <option value="NEAR_EXPIRY">Near to Expiry (Yellow)</option>
          <option value="EXPIRED">Expired (Red)</option>
          <option value="COLD_CHAIN">Cold-chain Issue</option>
          <option value="ELIGIBLE">Saleable / Eligible</option>
        </select>

        {/* Product Category Filter */}
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="text-xs font-semibold bg-white border border-[#EEDDD2] rounded-xl px-3.5 py-2 text-[#302722] shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
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
          className="text-xs font-semibold bg-white border border-[#EEDDD2] rounded-xl px-3.5 py-2 text-[#302722] shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#FFF8F3] text-[#76675F] border border-[#EEDDD2] shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#76675F]" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {/* Main Table or Empty State */}
      {batches.length === 0 ? (
        <EmptyState
          title="No products added yet"
          description="Your inventory is empty. Add your first perishable product to begin tracking expiry timelines and recovery opportunities."
          action={
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              {onOpenBulkUpload && (
                <button
                  onClick={onOpenBulkUpload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Bulk Add (CSV)</span>
                </button>
              )}
              {onOpenAddBatch && (
                <button
                  onClick={onOpenAddBatch}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#302722] hover:bg-black text-white cursor-pointer shadow-xs"
                >
                  Add Product to Inventory
                </button>
              )}
            </div>
          }
        />
      ) : filteredBatches.length === 0 ? (
        <EmptyState
          title="No batches match filters"
          description="Try adjusting your status or product category filter."
          action={
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#302722] hover:bg-black text-white cursor-pointer"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          <InventoryTable
            batches={paginatedBatches}
            selectedBatchId={selectedBatchId}
            onSelectBatch={onSelectBatch}
            onEditBatch={(b) => setBatchToEdit(b)}
            onDeleteBatch={(b) => setBatchToDelete(b)}
          />

          {/* Restrained Modern Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs text-xs">
            <div className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800 font-bold">{startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-800 font-bold">{filteredBatches.length}</strong> batches (10 per page)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validPage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer ${
                      pageNum === validPage
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === validPage ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validPage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
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
              onEdit={(b) => {
                onSelectBatch(null);
                setBatchToEdit(b);
              }}
              onDelete={(b) => {
                onSelectBatch(null);
                setBatchToDelete(b);
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      <EditBatchModal
        isOpen={Boolean(batchToEdit)}
        batch={batchToEdit}
        onClose={() => setBatchToEdit(null)}
        onUpdateBatch={async (updated) => {
          if (onUpdateBatch) {
            await onUpdateBatch(updated);
          }
          setBatchToEdit(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteProductModal
        isOpen={Boolean(batchToDelete)}
        batch={batchToDelete}
        onClose={() => setBatchToDelete(null)}
        onConfirm={async (b) => {
          if (onDeleteBatch) {
            await onDeleteBatch(b);
          }
        }}
      />
    </div>
  );
}
