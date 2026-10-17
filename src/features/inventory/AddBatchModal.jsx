import React, { useState } from 'react';
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
  Percent
} from 'lucide-react';
import { validateBatch } from '../../domain/validation.js';
import { checkEligibility } from '../../domain/eligibility.js';
import { getProductImage } from '../../data/fixtureLoader.js';

export function AddBatchModal({ isOpen, onClose, onAddBatch }) {
  if (!isOpen) return null;

  const defaultId = `B-${Math.floor(1000 + Math.random() * 9000)}`;

  const [formData, setFormData] = useState({
    id: defaultId,
    productName: '',
    category: 'Dairy',
    qty: 10,
    originalPrice: 50,
    incrementalCost: 25,
    daysUntilExpiry: 3,
    condition: 'good',
    coldChainStatus: 'ok',
    demandAssumption: 10,
    allowedMarkdownPercent: 40
  });

  const [errors, setErrors] = useState([]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
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
      demandEvidence: `Available (${demandAssumption} units)`
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

    onAddBatch(newBatch);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/50 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-scaleUp">
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Add Product to Inventory</h2>
              <p className="text-xs text-slate-500">Record a new perishable batch for tracking and markdown simulation.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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

          {/* Row 1: Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-bold text-slate-700">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Organic Almond Milk 1L"
                value={formData.productName}
                onChange={(e) => handleChange('productName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              <label className="font-bold text-slate-700">Batch ID</label>
              <input
                type="text"
                required
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Quantity on Hand (Units) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.qty}
                onChange={(e) => handleChange('qty', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 3: Original Price & Incremental Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Original Price (INR ₹) *</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                required
                value={formData.originalPrice}
                onChange={(e) => handleChange('originalPrice', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                <span>Incremental Cost (₹) *</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={formData.incrementalCost}
                onChange={(e) => handleChange('incrementalCost', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 4: Expiry Timeline & Demand Assumption */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Days Until Expiry</span>
              </label>
              <input
                type="number"
                value={formData.daysUntilExpiry}
                onChange={(e) => handleChange('daysUntilExpiry', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400">
                {parseInt(formData.daysUntilExpiry, 10) <= 0
                  ? '⚠️ Will be marked as Expired'
                  : parseInt(formData.daysUntilExpiry, 10) <= 3
                  ? '⚠️ Will be marked as Expiring Soon'
                  : 'Eligible for standard recovery'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Demand Assumption (Units)</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.demandAssumption}
                onChange={(e) => handleChange('demandAssumption', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 5: Quality Condition & Cold Chain */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Stock Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="good">Good / Packaged</option>
                <option value="damaged">Damaged (Will be blocked)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                <span>Cold-Chain Status</span>
              </label>
              <select
                value={formData.coldChainStatus}
                onChange={(e) => handleChange('coldChainStatus', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="ok">Required (OK / Monitored)</option>
                <option value="none">Not Required (Ambient)</option>
                <option value="exception">Exception / Review Required</option>
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Inventory</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
