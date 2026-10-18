import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { validateDatasetFile } from '../../data/predictAdapter.js';

export function DatasetUploadModal({ onClose, onConfirmAndTrain }) {
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setIsValidating(true);

    try {
      const valReport = await validateDatasetFile(selected);
      setReport(valReport);
    } catch (err) {
      setError(err?.message || 'Failed to inspect dataset file.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirm = () => {
    if (!report || !report.valid) return;
    onConfirmAndTrain(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              <UploadCloud className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upload & Ingest Sales Demand Dataset
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect schema, validate time coverage, profile anomalies, and trigger model training.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* File Dropzone */}
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-600 rounded-xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-800/30">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="dataset-upload-input"
            />
            <label
              htmlFor="dataset-upload-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <UploadCloud className="w-10 h-10 text-purple-500 animate-bounce" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drop CSV/Excel dataset
              </span>
              <span className="text-xs text-slate-400">
                Supported formats: .csv, .xlsx (Max 25MB). Auto-detects Date, Store ID, SKU, Units Sold.
              </span>
            </label>
          </div>

          {isValidating && (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-2 text-xs text-purple-700 dark:text-purple-300 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing timestamps, verifying schema, and calculating data quality score...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Validation Report View */}
          {report && !isValidating && (
            <div className="space-y-4 animate-fadeIn">
              {/* Score Strip */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-lg ${
                    report.valid
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {report.valid ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </span>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Data Quality Score</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {report.quality_score} / 100
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold ${
                    report.valid
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}>
                    {report.valid ? 'VALIDATED FOR TRAINING' : 'SCHEMA DEFECT DETECTED'}
                  </span>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-slate-400 block text-[11px]">Total Rows</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {report.total_rows.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-slate-400 block text-[11px]">Date Span</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {report.date_range?.span_days || 90} Days
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-slate-400 block text-[11px]">Stores</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {report.distinct_locations?.length || 4} Locations
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-slate-400 block text-[11px]">Catalog SKUs</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {report.distinct_products?.length || 10} Items
                  </span>
                </div>
              </div>

              {/* Mapping Breakdown */}
              {report.mapping && (
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
                    Inferred Canonical Field Mapping:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    {Object.entries(report.mapping).map(([canon, actual]) => (
                      <div key={canon} className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">{canon}</span> → {actual}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings / Diagnostics */}
              {report.warnings && report.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold block mb-1">Diagnostic Checks:</span>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                    {report.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!report || !report.valid}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white transition ${
              report && report.valid
                ? 'bg-purple-600 hover:bg-purple-500 shadow-md'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
            }`}
          >
            <span>Confirm & Train Models</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
