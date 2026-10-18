import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Table,
  Sparkles,
  Info
} from 'lucide-react';
import { getProductImage } from '../../data/fixtureLoader.js';

/**
 * Standard CSV Template content for download
 */
const SAMPLE_CSV = `Product Name,Quantity,Price,Cost,Category,Days Until Expiry,Allowed Markdown %
Artisan Sourdough Bread,10,60,30,Bakery,3,40
Whole Milk (1L),15,55,32,Dairy,2,30
Avocado Hass (Pack of 2),8,180,95,Produce,4,45
Chicken Salad Wrap,12,120,60,Bakery,1,50
Cold Brew Coffee (250ml),14,90,45,Beverage,5,35
Fresh Mozzarella Ball,6,150,80,Dairy,2,40`;

/**
 * Parses a line of CSV handling quoted fields with commas.
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Normalizes header names for flexible matching
 */
function normalizeHeaderKey(header) {
  const cleaned = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleaned.includes('name') || cleaned === 'product' || cleaned === 'item') return 'productName';
  if (cleaned.includes('qty') || cleaned.includes('quant') || cleaned === 'units' || cleaned === 'stock') return 'qty';
  if (cleaned.includes('price') || cleaned === 'mrp' || cleaned === 'rate') return 'originalPrice';
  if (cleaned.includes('cost')) return 'incrementalCost';
  if (cleaned.includes('cat') || cleaned === 'department') return 'category';
  if (cleaned.includes('expiry') || cleaned.includes('days') || cleaned.includes('shelflife')) return 'daysUntilExpiry';
  if (cleaned.includes('markdown') || cleaned.includes('discount')) return 'allowedMarkdownPercent';
  if (cleaned.includes('condition')) return 'condition';
  if (cleaned.includes('cold') || cleaned.includes('chain')) return 'coldChainStatus';
  if (cleaned.includes('id') || cleaned.includes('code') || cleaned === 'batch') return 'id';
  return header;
}

export function BulkUploadModal({ isOpen, onClose, onBulkAdd }) {
  if (!isOpen) return null;

  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // { success: true, count: 5 }

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory_bulk_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processCsvText = (text) => {
    setParseErrors([]);
    setImportStatus(null);
    if (!text || !text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      setParseErrors(['CSV must contain at least a header row and one product row.']);
      setParsedRows([]);
      return;
    }

    const headerLine = lines[0];
    const rawHeaders = parseCsvLine(headerLine);
    const normalizedHeaders = rawHeaders.map(normalizeHeaderKey);

    const hasProductName = normalizedHeaders.includes('productName');
    const hasPrice = normalizedHeaders.includes('originalPrice');

    if (!hasProductName) {
      setParseErrors(['Missing required column: "Product Name" (or "Name", "Product").']);
      setParsedRows([]);
      return;
    }

    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCsvLine(line);
      const rowObj = {};

      normalizedHeaders.forEach((key, colIdx) => {
        rowObj[key] = values[colIdx] !== undefined ? values[colIdx] : '';
      });

      const productName = (rowObj.productName || '').trim();
      const rawQty = rowObj.qty ? parseInt(rowObj.qty, 10) : 10;
      const rawPrice = rowObj.originalPrice ? parseFloat(rowObj.originalPrice) : 50;
      const rawCost = rowObj.incrementalCost ? parseFloat(rowObj.incrementalCost) : Math.round(rawPrice * 0.5 * 100) / 100;
      const rawDays = rowObj.daysUntilExpiry ? parseInt(rowObj.daysUntilExpiry, 10) : 3;
      const rawMarkdown = rowObj.allowedMarkdownPercent ? parseInt(rowObj.allowedMarkdownPercent, 10) : 40;
      const category = (rowObj.category || 'General').trim();
      const condition = (rowObj.condition || 'good').trim().toLowerCase();
      const coldChainStatus = (rowObj.coldChainStatus || 'compliant').trim().toLowerCase();
      const customId = (rowObj.id || '').trim();

      const rowErrors = [];
      if (!productName) rowErrors.push('Missing product name');
      if (isNaN(rawQty) || rawQty <= 0) rowErrors.push('Quantity must be greater than 0');
      if (isNaN(rawPrice) || rawPrice <= 0) rowErrors.push('Price must be greater than 0');
      if (isNaN(rawCost) || rawCost < 0) rowErrors.push('Cost cannot be negative');

      const batchId = customId || `B-${Math.floor(1000 + Math.random() * 9000)}`;
      const expiryAt = new Date(Date.now() + (rawDays || 3) * 86400000).toISOString();

      rows.push({
        rowIndex: i,
        id: batchId,
        productName,
        category: category || 'General',
        qty: isNaN(rawQty) ? 10 : rawQty,
        originalPrice: isNaN(rawPrice) ? 50 : rawPrice,
        incrementalCost: isNaN(rawCost) ? 25 : rawCost,
        daysUntilExpiry: isNaN(rawDays) ? 3 : rawDays,
        allowedMarkdownPercent: isNaN(rawMarkdown) ? 40 : Math.min(90, Math.max(0, rawMarkdown)),
        expiryAt,
        condition: condition === 'damaged' ? 'damaged' : 'good',
        coldChainStatus: condition === 'exception' ? 'exception' : (coldChainStatus || 'compliant'),
        image: getProductImage(batchId, productName),
        isValid: rowErrors.length === 0,
        errors: rowErrors
      });
    }

    setParsedRows(rows);
    if (errors.length > 0) setParseErrors(errors);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setPastedText(text);
        processCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setPastedText(text);
        processCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e) => {
    const val = e.target.value;
    setPastedText(val);
    processCsvText(val);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    try {
      if (onBulkAdd) {
        const res = await onBulkAdd(validRows);
        setImportStatus({
          success: true,
          count: res?.count || validRows.length
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setParseErrors([err.message || 'Import failed unexpectedly']);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bulk Add Products via CSV</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload or paste a CSV file to import multiple products into store inventory at once.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar: Download Sample Template */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Need a template?</span>
              <p className="text-emerald-700 text-[11px] mt-0.5">
                Download our formatted sample CSV with columns for Name, Quantity, Price, Cost, Category & Expiry.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </button>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
              activeTab === 'upload'
                ? 'border-[#D97757] text-[#D97757]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Upload CSV File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
              activeTab === 'paste'
                ? 'border-[#D97757] text-[#D97757]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Paste CSV Data
          </button>
        </div>

        {/* Tab 1: File Upload Dropzone */}
        {activeTab === 'upload' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-emerald-600">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {fileName ? fileName : 'Click to browse or drag & drop CSV file'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports UTF-8 CSV up to 1,000 products</p>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Raw CSV Text */}
        {activeTab === 'paste' && (
          <div className="space-y-2">
            <textarea
              rows={6}
              value={pastedText}
              onChange={handlePasteChange}
              placeholder="Product Name,Quantity,Price,Cost,Category,Days Until Expiry,Allowed Markdown %&#10;Artisan Bread,10,50,25,Bakery,3,40&#10;Farm Milk 1L,20,60,35,Dairy,2,30"
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        )}

        {/* Error Messages */}
        {parseErrors.length > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>CSV Formatting Issues</span>
            </div>
            {parseErrors.map((err, i) => (
              <p key={i} className="pl-5 text-[11px]">{err}</p>
            ))}
          </div>
        )}

        {/* Parsed Rows Preview */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Table className="w-4 h-4 text-slate-500" />
                <span>Parsed Products ({parsedRows.length})</span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {validCount} Valid
                </span>
                {invalidCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">
                    {invalidCount} Invalid
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto shadow-inner">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Product Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Qty</th>
                    <th className="py-2 px-3">Price / Cost</th>
                    <th className="py-2 px-3">Shelf Life</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} className={r.isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/50'}>
                      <td className="py-2 px-3">
                        {r.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500" title={r.errors.join(', ')} />
                        )}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{r.image}</span>
                        <span>{r.productName || <em className="text-rose-400">Missing</em>}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{r.category}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.qty}</td>
                      <td className="py-2 px-3 text-slate-700">₹{r.originalPrice} / ₹{r.incrementalCost}</td>
                      <td className="py-2 px-3 text-slate-500">{r.daysUntilExpiry} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success Status Notice */}
        {importStatus?.success && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 flex items-center gap-2 font-bold text-xs animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Successfully imported {importStatus.count} products into inventory!</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={validCount === 0 || isProcessing}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer ${
              validCount > 0 && !isProcessing
                ? 'bg-slate-900 hover:bg-black'
                : 'bg-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing Products...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Import {validCount > 0 ? `${validCount} Products` : 'Products'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
