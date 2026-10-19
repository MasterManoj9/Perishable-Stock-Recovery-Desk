import React, { useState, useEffect } from 'react';
import {
  X,
  Percent,
  TrendingDown,
  Tag,
  Coins,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Sliders,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

const PRESET_DISCOUNTS = [25, 40, 50, 60, 70, 80];

export function AdjustDiscountModal({
  isOpen,
  onClose,
  batch,
  onApplyDiscount
}) {
  if (!isOpen || !batch) return null;

  const initialDiscount = Number(batch.allowedMarkdownPercent || batch.allowed_markdown_percent || 40);
  const [discountPercent, setDiscountPercent] = useState(initialDiscount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    const d = Number(batch.allowedMarkdownPercent || batch.allowed_markdown_percent || 40);
    setDiscountPercent(d);
    setSuccessMessage(null);
  }, [batch]);

  const originalPrice = Number(batch.originalPrice || 0);
  const incrementalCost = Number(batch.incrementalCost || 0);

  // Calculate new selling price
  const newSellingPrice = Math.max(1, Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100);
  const customerSavings = Math.round((originalPrice - newSellingPrice) * 100) / 100;
  const unitMargin = Math.round((newSellingPrice - incrementalCost) * 100) / 100;
  const potentialTotalRecovery = Math.round(newSellingPrice * (batch.qty || 0));

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const updatedBatch = {
        ...batch,
        allowedMarkdownPercent: discountPercent,
        allowed_markdown_percent: discountPercent,
        currentPrice: newSellingPrice,
        current_selling_price_paise: Math.round(newSellingPrice * 100),
        sale_price_inr: newSellingPrice,
        discountedPrice: newSellingPrice
      };

      if (onApplyDiscount) {
        await onApplyDiscount(updatedBatch);
      }

      setSuccessMessage(`New ${discountPercent}% discount applied! Now live at ₹${newSellingPrice} in customer shop & inventory.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to update discount:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shrink-0">
              <TrendingDown className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Keep More Discount</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Fast Clearance
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lower price to accelerate sell-through for near-expiry or slow-moving batches.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Details Header Strip */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
              {batch.imageUrl ? (
                <img src={batch.imageUrl} alt={batch.productName} className="w-full h-full object-cover" />
              ) : (
                batch.image || '📦'
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{batch.productName}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Batch: {batch.id} • {batch.qty} units left</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400 uppercase font-semibold">MRP Price</div>
            <div className="text-base font-extrabold text-slate-900">₹{originalPrice}</div>
          </div>
        </div>

        {/* Interactive Discount Bar / Slider */}
        <div className="space-y-4 p-5 bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-2xl border border-emerald-200/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Discount Clearance Bar
              </span>
            </div>
            <span className="text-2xl font-black text-emerald-600 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
              {discountPercent}% OFF
            </span>
          </div>

          {/* Range Slider Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-hidden"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #059669 ${((discountPercent - 10) / 80) * 100}%, #e2e8f0 ${((discountPercent - 10) / 80) * 100}%, #e2e8f0 100%)`
              }}
            />
            <div className="flex justify-between text-[11px] font-semibold text-slate-400">
              <span>10% (Subtle)</span>
              <span>50% (Recommended)</span>
              <span>90% (Urgent Clearance)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs font-bold text-slate-500 mr-1">Presets:</span>
            {PRESET_DISCOUNTS.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setDiscountPercent(preset)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  discountPercent === preset
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Economic Impact Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* New Selling Price */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">New Selling Price</span>
            <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
              ₹{newSellingPrice}
            </div>
            <span className="text-[10px] text-slate-400 line-through">MRP: ₹{originalPrice}</span>
          </div>

          {/* Customer Savings */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Customer Savings</span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              ₹{customerSavings}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">{discountPercent}% savings</span>
          </div>

          {/* Unit Margin */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Unit Margin</span>
            <div className={`text-xl font-extrabold mt-0.5 ${unitMargin >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              ₹{unitMargin}
            </div>
            <span className="text-[10px] text-slate-400">Cost: ₹{incrementalCost}</span>
          </div>
        </div>

        {/* Live Reflection Notice */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Immediate Multi-Dashboard Sync:</strong> Saving this discount updates the batch in your inventory and immediately shows the discounted price with a <strong>{discountPercent}% OFF badge</strong> in the Customer Recovery Storefront.
          </p>
        </div>

        {/* Success message banner */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#302722] hover:bg-black disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            <span>{isSubmitting ? 'Updating Discount...' : `Apply ${discountPercent}% Discount`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
