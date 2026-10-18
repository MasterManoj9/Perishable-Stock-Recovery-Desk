import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Edit2,
  Package,
  Calendar,
  Tag,
  Coins,
  TrendingUp,
  Snowflake,
  AlertCircle,
  Percent,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { validateBatch } from '../../domain/validation.js';
import { checkEligibility, classifyExpiry } from '../../domain/eligibility.js';
import { getProductImage } from '../../data/fixtureLoader.js';
import { validateImageFile, readFileAsDataUrl, uploadProductImage } from '../../lib/imageUpload.js';

function extractDateStr(batch) {
  if (batch?.expiryAt) {
    try {
      const d = new Date(batch.expiryAt);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
  }
  const days = batch?.daysUntilExpiry !== undefined ? Number(batch.daysUntilExpiry) : 4;
  const target = new Date(Date.now() + days * 86400000);
  return target.toISOString().split('T')[0];
}

export function EditBatchModal({ isOpen, onClose, batch, onUpdateBatch }) {
  if (!isOpen || !batch) return null;

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: batch.id || '',
    _origId: batch.id || '',
    productName: batch.productName || '',
    category: batch.category || 'Produce',
    qty: batch.qty !== undefined ? batch.qty : 10,
    originalPrice: batch.originalPrice !== undefined ? batch.originalPrice : 50,
    incrementalCost: batch.incrementalCost !== undefined ? batch.incrementalCost : 25,
    expiryDate: extractDateStr(batch),
    daysUntilExpiry: batch.daysUntilExpiry !== undefined ? batch.daysUntilExpiry : 4,
    condition: batch.condition || 'good',
    coldChainStatus: batch.coldChainStatus || 'compliant',
    demandAssumption: batch.demandAssumption || 10,
    allowedMarkdownPercent: batch.allowedMarkdownPercent !== undefined ? batch.allowedMarkdownPercent : 40,
    imageUrl: batch.imageUrl || null
  });

  const [imagePreview, setImagePreview] = useState(batch.imageUrl || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (batch) {
      setFormData({
        id: batch.id || '',
        _origId: batch.id || '',
        productName: batch.productName || '',
        category: batch.category || 'Produce',
        qty: batch.qty !== undefined ? batch.qty : 10,
        originalPrice: batch.originalPrice !== undefined ? batch.originalPrice : 50,
        incrementalCost: batch.incrementalCost !== undefined ? batch.incrementalCost : 25,
        expiryDate: extractDateStr(batch),
        daysUntilExpiry: batch.daysUntilExpiry !== undefined ? batch.daysUntilExpiry : 4,
        condition: batch.condition || 'good',
        coldChainStatus: batch.coldChainStatus || 'compliant',
        demandAssumption: batch.demandAssumption || 10,
        allowedMarkdownPercent: batch.allowedMarkdownPercent !== undefined ? batch.allowedMarkdownPercent : 40,
        imageUrl: batch.imageUrl || null
      });
      setImagePreview(batch.imageUrl || null);
      setErrors([]);
    }
  }, [batch]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExpiryDateChange = (dateVal) => {
    if (!dateVal) {
      setFormData(prev => ({ ...prev, expiryDate: '', daysUntilExpiry: 0 }));
      return;
    }
    const target = new Date(dateVal + 'T23:59:59');
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    setFormData(prev => ({
      ...prev,
      expiryDate: dateVal,
      daysUntilExpiry: diffDays
    }));
  };

  const handleDaysChange = (daysVal) => {
    const days = parseInt(daysVal, 10);
    if (isNaN(days)) {
      setFormData(prev => ({ ...prev, daysUntilExpiry: daysVal }));
      return;
    }
    const target = new Date(Date.now() + days * 86400000);
    setFormData(prev => ({
      ...prev,
      daysUntilExpiry: days,
      expiryDate: target.toISOString().split('T')[0]
    }));
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
      const localDataUrl = await readFileAsDataUrl(file);
      setImagePreview(localDataUrl);

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
    const demandAssumption = parseInt(formData.demandAssumption, 10) || qty;
    const allowedMarkdownPercent = parseInt(formData.allowedMarkdownPercent, 10) || 40;
    const daysUntilExpiry = parseInt(formData.daysUntilExpiry, 10);

    const isExpired = daysUntilExpiry <= 0;
    const expiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 3;
    const finalColdChain = formData.coldChainStatus;

    let newExpiryAt;
    if (formData.expiryDate) {
      newExpiryAt = new Date(formData.expiryDate + 'T23:59:59.999Z').toISOString();
    } else if (!isNaN(daysUntilExpiry)) {
      newExpiryAt = new Date(Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000).toISOString();
    } else {
      newExpiryAt = batch.expiryAt || new Date().toISOString();
    }

    const rawBatch = {
      ...batch,
      _origId: formData._origId || batch.id,
      id: formData.id.trim() || batch.id,
      batch_code: formData.id.trim() || batch.id,
      productName: formData.productName.trim() || 'Perishable Stock Item',
      category: formData.category,
      qty,
      sale_price_inr: originalPrice,
      originalPrice,
      incremental_cost_inr: incrementalCost,
      incrementalCost,
      expired: isExpired,
      condition: formData.condition,
      cold_chain_status: finalColdChain,
      coldChainStatus: finalColdChain,
      demand_assumption_units: demandAssumption,
      demandAssumption,
      allowed_markdown_percent: allowedMarkdownPercent,
      allowedMarkdownPercent,
      daysUntilExpiry,
      expiryAt: newExpiryAt,
      expiringSoon,
      expiryDisplay: isExpired ? 'Expired' : `in ${daysUntilExpiry} days`,
      expiryNote: isExpired ? 'Expired today' : `Expires in ${daysUntilExpiry} days`,
      imageUrl: formData.imageUrl || imagePreview || null
    };

    const validation = validateBatch(rawBatch);
    if (!validation.valid) {
      setErrors(validation.errors.map(err => err.message));
      return;
    }

    const eligibility = checkEligibility(rawBatch);
    const expiryClassification = classifyExpiry(rawBatch);

    const updatedBatch = {
      ...rawBatch,
      image: rawBatch.imageUrl ? null : getProductImage(rawBatch.id, rawBatch.productName),
      unitMargin: Math.round((originalPrice - incrementalCost) * 100) / 100,
      eligibility,
      expiryClassification
    };

    setIsSubmitting(true);
    try {
      if (onUpdateBatch) {
        await onUpdateBatch(updatedBatch);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update product in inventory:', err);
      setErrors([err.message || 'Failed to save changes. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysNum = parseInt(formData.daysUntilExpiry, 10);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl border border-[#EEDDD2] shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto animate-scaleUp">
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#EEDDD2] flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1E8] text-[#D97757] flex items-center justify-center font-bold">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#302722] tracking-tight">Edit Product & Inventory</h2>
              <p className="text-xs text-[#76675F]">Update product name, expiry date, pricing, stock and specs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-[#76675F] hover:text-[#302722] hover:bg-[#FFF8F3] rounded-full transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Validation Errors */}
        {errors.length > 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Please correct the following:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Image Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#302722] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Product Image</span>
              </span>
              <span className="text-[10px] font-normal text-[#76675F]">JPG, PNG, WebP (Max 5MB)</span>
            </label>

            {imagePreview ? (
              <div className="relative rounded-xl border border-[#EEDDD2] p-2 bg-[#FFF8F3] flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-[#EEDDD2] shrink-0">
                  <img src={imagePreview} alt="Product Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#302722] truncate">{formData.productName || 'Product Image'}</p>
                  <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Image ready to save</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#D97757] bg-[#FFF1E8]'
                    : 'border-[#EEDDD2] hover:border-[#D97757] bg-[#FFF8F3]/50 hover:bg-[#FFF8F3]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="flex flex-col items-center gap-1.5">
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-6 h-6 text-[#D97757] animate-spin" />
                      <span className="text-xs font-semibold text-[#302722]">Processing image...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-[#76675F]" />
                      <span className="text-xs font-bold text-[#302722]">Click or drag & drop image</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {imageError && (
              <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{imageError}</span>
              </p>
            )}
          </div>

          {/* Row 1: Batch Code & Product Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722]">Batch Code / ID *</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-mono font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                placeholder="e.g. B-101"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#302722]">Product Name *</label>
              <input
                type="text"
                id="edit-product-name-input"
                required
                value={formData.productName}
                onChange={(e) => handleChange('productName', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                placeholder="e.g. Organic Cow Milk 1L"
              />
            </div>
          </div>

          {/* Row 2: Category & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722]">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              >
                <option value="Produce">Produce (Fruits & Veggies)</option>
                <option value="Dairy">Dairy & Cheese</option>
                <option value="Bakery">Bakery & Pastries</option>
                <option value="Meat">Meat & Poultry</option>
                <option value="Beverage">Beverages & Juices</option>
                <option value="Prepared">Ready Meals / Prepared</option>
                <option value="General">General Grocery</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Available Quantity *</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.qty}
                onChange={(e) => handleChange('qty', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>
          </div>

          {/* Row 3: Pricing & Economics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Original Price (INR ₹) *</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={formData.originalPrice}
                onChange={(e) => handleChange('originalPrice', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Incremental Unit Cost (₹) *</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={formData.incrementalCost}
                onChange={(e) => handleChange('incrementalCost', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>
          </div>

          {/* Row 4: Expiry Date (Date Picker) & Days Remaining */}
          <div className="p-3.5 bg-[#FFF8F3]/60 rounded-xl border border-[#EEDDD2] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#302722] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#D97757]" />
                <span>Expiry Date & Timeline *</span>
              </label>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                daysNum <= 0
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : daysNum <= 3
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {daysNum <= 0
                  ? '🔴 Expired (Not saleable)'
                  : daysNum <= 3
                  ? `🟡 Near to Expiry (${daysNum}d)`
                  : `🟢 Fresh (${daysNum}d)`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#76675F]">Calendar Expiry Date (YYYY-MM-DD)</span>
                <input
                  type="date"
                  id="edit-expiry-date-input"
                  required
                  value={formData.expiryDate}
                  onChange={(e) => handleExpiryDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#76675F]">Days Until Expiry</span>
                <input
                  type="number"
                  value={formData.daysUntilExpiry}
                  onChange={(e) => handleDaysChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Markdown Limit & Demand Assumption */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-[#76675F]" />
                <span>Max Allowed Markdown (%)</span>
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={formData.allowedMarkdownPercent}
                onChange={(e) => handleChange('allowedMarkdownPercent', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-bold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1">
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

          {/* Row 6: Quality Condition & Cold Chain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#EEDDD2]">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722]">Stock Condition</label>
              <select
                id="edit-condition-select"
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] cursor-pointer"
              >
                <option value="good">Good / Packaged (Eligible)</option>
                <option value="fair">Fair (Review recommended)</option>
                <option value="damaged">Damaged (Blocked from customer sale)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#302722] flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                <span>Cold-Chain Status</span>
              </label>
              <select
                id="edit-cold-chain-select"
                value={formData.coldChainStatus}
                onChange={(e) => handleChange('coldChainStatus', e.target.value)}
                className="w-full px-3 py-2 bg-[#FFF8F3] border border-[#EEDDD2] rounded-xl text-xs font-semibold text-[#302722] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] cursor-pointer"
              >
                <option value="compliant">Compliant (Temperature Monitored - Safe)</option>
                <option value="exception">Cold-Chain Exception (Blocked from sale)</option>
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
              id="submit-edit-product-btn"
              disabled={isUploadingImage || isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#302722] hover:bg-black rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
