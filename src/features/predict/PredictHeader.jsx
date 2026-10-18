import React from 'react';
import { Sparkles, RefreshCw, UploadCloud, Store, Layers, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export function PredictHeader({
  selectedLocation,
  onLocationChange,
  selectedProduct,
  onProductChange,
  horizonDays,
  onHorizonChange,
  activeModelName,
  lastTrainedAt,
  isRetraining,
  onRetrain,
  onOpenUpload,
  qualityScore = 100
}) {
  const locations = [
    { id: 'all', label: 'All Stores (4 Locations)' },
    { id: 'CAFE01', label: 'CAFE01 · Campus Corner (Cafe)' },
    { id: 'CAFE02', label: 'CAFE02 · Neighbourhood Brew (Cafe)' },
    { id: 'GROC01', label: 'GROC01 · Green Basket (Grocery)' },
    { id: 'GROC02', label: 'GROC02 · Metro Mini Mart (Grocery)' }
  ];

  const products = [
    { id: 'all', label: 'All SKUs (10 Products)' },
    { id: 'CAF01', label: 'CAF01 · Butter Croissant' },
    { id: 'CAF02', label: 'CAF02 · Blueberry Muffin' },
    { id: 'CAF03', label: 'CAF03 · Vegetable Sandwich' },
    { id: 'CAF04', label: 'CAF04 · Paneer Wrap' },
    { id: 'CAF05', label: 'CAF05 · Chocolate Brownie' },
    { id: 'GRO01', label: 'GRO01 · Milk 1 L' },
    { id: 'GRO02', label: 'GRO02 · Bread Loaf' },
    { id: 'GRO03', label: 'GRO03 · Eggs (6-pack)' },
    { id: 'GRO04', label: 'GRO04 · Curd 500 g' },
    { id: 'GRO05', label: 'GRO05 · Bananas 1 kg' }
  ];

  const formattedDate = lastTrainedAt
    ? new Date(lastTrainedAt).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '2026-10-18';

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-6 transition-colors shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand & Subtitle */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">FYND Predict</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                AI Demand Intelligence
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Empirical demand forecasting, multi-model evaluation, and verifiable stock replenishment intelligence.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Dataset</span>
          </button>

          <button
            onClick={onRetrain}
            disabled={isRetraining}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white shadow-xs transition ${
              isRetraining
                ? 'bg-purple-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            <span>{isRetraining ? 'Fitting Models...' : 'Retrain Model'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Status Strip */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Store Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id} className="dark:bg-slate-900">{loc.label}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProduct}
              onChange={(e) => onProductChange(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer max-w-[200px] truncate"
            >
              {products.map(p => (
                <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.label}</option>
              ))}
            </select>
          </div>

          {/* Horizon Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => onHorizonChange(1)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                horizonDays === 1
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Next Day (T+1)
            </button>
            <button
              onClick={() => onHorizonChange(7)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                horizonDays === 7
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Next 7 Days (7D)
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Model:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{activeModelName || 'Global Gradient Boosting'}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Trained: {formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
