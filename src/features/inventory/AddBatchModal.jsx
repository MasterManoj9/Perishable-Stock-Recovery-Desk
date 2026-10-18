import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Package,
  Calendar,
  Tag,
  Coins,
  TrendingUp,
  Snowflake,
  AlertCircle,
  CheckCircle2,
  Percent,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { validateBatch } from '../../domain/validation.js';
import { checkEligibility } from '../../domain/eligibility.js';
import { getProductImage } from '../../data/fixtureLoader.js';
import { validateImageFile, readFileAsDataUrl, uploadProductImage } from '../../lib/imageUpload.js';

export function AddBatchModal({ isOpen, onClose, onAddBatch }) {
  if (!isOpen) return null;

  const defaultId = `B-${Math.floor(1000 + Math.random() * 9000)}`;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: defaultId,
    productName: '',
    category: 'Dairy',
    qty: 10,
    originalPrice: 50,
    incrementalCost: 25,
    daysUntilExpiry: 3,
    condition: 'good',
    coldChainStatus: 'compliant',
    demandAssumption: 10,
    allowedMarkdownPercent: 40,
    imageUrl: null
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    setImageError(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error);
      return;
    }

    try {
      // 1. Immediate local preview
      const localDataUrl = await readFileAsDataUrl(file);
      setImagePreview(localDataUrl);

      // 2. Upload to persistent storage (Supabase bucket or persistent data URL)
      setIsUploadingImage(true);
      const uploadResult = await uploadProductImage(file);
      if (uploadResult?.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: uploadResult.imageUrl }));
      }
    } catch (err) {
      console.warn('Image upload failed:', err);
      setImageError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageError(null);
    setFormData(prev => ({ ...prev, imageUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const qty = parseInt(formData.qty, 10);
    const originalPrice = parseFloat(formData.originalPrice);
    const incrementalCost = parseFloat(formData.incrementalCost);
    const demandAssumption = parseInt(formData.demandAssumption, 10);
    const allowedMarkdownPercent = parseInt(formData.allowedMarkdownPercent, 10) || 40;
    const daysUntilExpiry = parseInt(formData.daysUntilExpiry, 10);

    const isExpired = daysUntilExpiry <= 0;
    const expiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 3;

    // Construct raw batch object
    const rawBatch = {
      id: formData.id.trim() || defaultId,
      productName: formData.productName.trim() || 'Perishable Stock Item',
      category: formData.category,
      qty,
      sale_price_inr: originalPrice,
      originalPrice,
      incremental_cost_inr: incrementalCost,
      incrementalCost,
      expired: isExpired,
      condition: formData.condition,
      cold_chain_status: formData.coldChainStatus,
      coldChainStatus: formData.coldChainStatus,
      demand_assumption_units: demandAssumption,
      demandAssumption,
      allowed_markdown_percent: allowedMarkdownPercent,
      allowedMarkdownPercent,
      daysUntilExpiry,
      expiringSoon,
      expiryDisplay: isExpired ? 'Expired' : `in ${daysUntilExpiry} days`,
      expiryNote: isExpired ? 'Expired today' : `Expires in ${daysUntilExpiry} days`,
      demandEvidence: `Available (${demandAssumption} units)`,
      imageUrl: formData.imageUrl || imagePreview || null
    };

    // Validate using pure domain validator
    const validation = validateBatch(rawBatch);
    if (!validation.valid) {
      setErrors(validation.errors.map(err => err.message));
      return;
    }

    // Check eligibility using domain engine
    const eligibility = checkEligibility(rawBatch);

    const newBatch = {
      ...rawBatch,
      image: getProductImage(rawBatch.id, rawBatch.productName),
      unitMargin: Math.round((originalPrice - incrementalCost) * 100) / 100,
      eligibility
    };

    setIsSubmitting(true);
    try {
      if (onAddBatch) {
        await onAddBatch(newBatch);
      }
      onClose();
    } catch (err) {
      console.error('Failed to add product to inventory:', err);
      setErrors([err.message || 'Failed to save product to database. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/50 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl border border-[#EEDDD2] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-scaleUp">
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#EEDDD2] flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1E8] text-[#D97757] flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#302722] tracking-tight">Add Product to Inventory</h2>
              <p className="text-xs text-[#76675F]">Record a new perishable item with real product photo and parameters.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#76675F] hover:text-[#302722] hover:bg-[#FFF8F3] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Please correct the following errors:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Dedicated Product Image Upload Section */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#302722] flex items-center justify-between">
              <span>Product Image</span>
              <span className="text-[10px] font-normal text-[#76675F]">JPEG, PNG, WebP (up to 5 MB)</span>
            </label>

            {imageError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{imageError}</span>
              </div>
            )}

            {imagePreview ? (
              <div className="relative rounded-2xl border border-[#EEDDD2] bg-[#FFF8F3] p-3 flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-[#EEDDD2] shrink-0 shadow-xs relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#302722] text-xs">Product Image Attached</span>
                    {isUploadingImage ? (
                      <span className="text-[10px] font-semibold text-[#D97757] animate-pulse">Processing...</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#76675F] mt-0.5 truncate">
                    Image will be persisted to store catalog and customer shop.
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#302722] bg-white border border-[#EEDDD2] hover:bg-[#FFF1E8] rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-[#D97757]" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#D97757] bg-[#FFF1E8]'
                    : 'border-[#EEDDD2] bg-[#FFF8F3] hover:border-[#D97757]/60 hover:bg-[#FFF1E8]/50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#EEDDD2] flex items-center justify-center text-[#D97757] mx-auto mb-2 shadow-xs">
                  {isUploadingImage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>
                <div className="font-bold text-[#302722] text-xs">
                  {isUploadingImage ? 'Uploading image...' : 'Upload product image'}
                </div>
                <p className="text-[11px] text-[#76675F] mt-0.5">
                  Drag and drop file here, or click to browse
                </p>
                <span className="inline-block mt-2 text-[10px] font-semibold px-2.5 py-1 bg-white border border-[#EEDDD2] rounded-lg text-[#302722] shadow-xs">
                  Browse File
                </span>
              </div>
            )}

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Row 1: Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-bold text-[#302722]">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Organic Almond Milk 1L"
                value={formData.productName}
                onChange={(e) => handleChange('productName', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-medium text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#302722]">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              >
                <option value="Dairy">Dairy</option>
                <option value="Bakery">Bakery</option>
                <option value="Produce">Produce</option>
                <option value="Meat">Meat</option>
                <option value="Beverage">Beverage</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Row 2: Batch ID & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-[#302722]">Batch ID</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-mono font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#302722]">Quantity on Hand (Units) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.qty}
                onChange={(e) => handleChange('qty', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>
          </div>

          {/* Row 3: Original Price & Incremental Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-[#302722] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Original Price (INR ₹) *</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                required
                value={formData.originalPrice}
                onChange={(e) => handleChange('originalPrice', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#302722] flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Incremental Cost (₹) *</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={formData.incrementalCost}
                onChange={(e) => handleChange('incrementalCost', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>
          </div>

          {/* Row 4: Expiry Timeline & Demand Assumption */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-[#302722] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Days Until Expiry</span>
              </label>
              <input
                type="number"
                value={formData.daysUntilExpiry}
                onChange={(e) => handleChange('daysUntilExpiry', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
              <span className="text-[10px] text-[#76675F]">
                {parseInt(formData.daysUntilExpiry, 10) <= 0
                  ? '⚠️ Will be marked as Expired'
                  : parseInt(formData.daysUntilExpiry, 10) <= 3
                  ? '⚠️ Will be marked as Expiring Soon'
                  : 'Eligible for standard recovery'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#302722] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Demand Assumption (Units)</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.demandAssumption}
                onChange={(e) => handleChange('demandAssumption', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>
          </div>

          {/* Row 5: Quality Condition & Cold Chain */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EEDDD2]">
            <div className="space-y-1.5">
              <label className="font-bold text-[#302722]">Stock Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              >
                <option value="good">Good / Packaged</option>
                <option value="damaged">Damaged (Will be blocked)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-[#302722] flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                <span>Cold-Chain Status</span>
              </label>
              <select
                value={formData.coldChainStatus}
                onChange={(e) => handleChange('coldChainStatus', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              >
                <option value="compliant">Compliant (Temperature Monitored)</option>
                <option value="exception">Cold-Chain Exception (Review Required)</option>
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#EEDDD2] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-[#76675F] hover:bg-[#FFF8F3] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-add-product-btn"
              disabled={isUploadingImage || isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#302722] hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Add to Inventory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

