/**
 * DeleteProductModal.jsx — Delete Product Confirmation Modal
 * 
 * Provides an accessible, guarded confirmation dialog before deleting or
 * archiving a product from the active inventory.
 */

import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2, Package } from 'lucide-react';

export function DeleteProductModal({
  isOpen,
  batch,
  onClose,
  onConfirm
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !batch) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(batch);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err?.message || 'Failed to delete product from database. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[#EEDDD2] shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#EEDDD2] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/60 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base font-bold text-[#302722]">
                Delete Product?
              </h2>
              <p className="text-xs text-[#76675F] mt-0.5">
                Batch code: <span className="font-mono font-semibold text-[#302722]">{batch.id}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-[#76675F] hover:text-[#302722] hover:bg-[#FFF8F3] rounded-full transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Cancel and close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs sm:text-sm text-[#76675F] leading-relaxed">
            Are you sure you want to delete <strong className="text-[#302722] font-semibold">{batch.productName}</strong>? This action will remove the product from the active inventory and customer-facing product listings.
          </p>

          {/* Product Summary Card */}
          <div className="p-3.5 bg-[#FFF8F3] rounded-xl border border-[#EEDDD2] flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white border border-[#EEDDD2] flex items-center justify-center text-xl shrink-0 overflow-hidden">
              {batch.imageUrl ? (
                <img src={batch.imageUrl} alt={batch.productName} className="w-full h-full object-cover" />
              ) : (
                batch.image || '📦'
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-[#302722] truncate">{batch.productName}</p>
              <div className="flex items-center gap-2 text-[11px] text-[#76675F] mt-0.5">
                <span>{batch.qty} units in stock</span>
                <span>•</span>
                <span className="font-semibold text-emerald-700">₹{batch.originalPrice}</span>
                <span>•</span>
                <span className="truncate">{batch.category || 'General'}</span>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Historical purchase records, order logs, and analytical reports will preserve audit continuity and will not be damaged.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <strong className="block font-semibold mb-0.5">Deletion failed:</strong>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 pt-3 bg-[#FFF8F3]/60 border-t border-[#EEDDD2] flex items-center justify-end gap-3">
          <button
            type="button"
            id="delete-modal-cancel-btn"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-[#302722] hover:bg-[#FFE8DC] bg-white border border-[#EEDDD2] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="delete-modal-confirm-btn"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Product...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Product</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteProductModal;
