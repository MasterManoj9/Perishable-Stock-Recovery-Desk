/**
 * decisionStore.js - Client-Side Decision Persistence & Export Engine
 *
 * Implements:
 * - Versioned localStorage persistence under 'c30_decisions_v1'
 * - Defensive JSON parsing with corrupted data recovery
 * - RFC 4180-compliant CSV generation with field escaping
 * - Formatted JSON exports with synthetic data disclaimers
 */

export const DECISIONS_STORAGE_KEY = 'c30_decisions_v1';

/**
 * Loads all committed decisions from localStorage.
 * @returns {Array<Object>}
 */
export function getStoredDecisions() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DECISIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse stored decisions from localStorage:', err);
    return [];
  }
}

/**
 * Saves a new decision record to localStorage.
 * @param {Object} decisionRecord
 * @returns {Array<Object>} Updated list of decisions
 */
export function saveDecision(decisionRecord) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const existing = getStoredDecisions();
    const newRecord = {
      id: `DEC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      timestampFormatted: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      managerName: 'Demo Manager',
      ...decisionRecord
    };

    const updated = [newRecord, ...existing];
    window.localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save decision to localStorage:', err);
    throw new Error('Storage write failed. LocalStorage quota may be exceeded.');
  }
}

/**
 * Clears all stored decisions from localStorage.
 */
export function clearStoredDecisions() {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(DECISIONS_STORAGE_KEY);
  }
}

/**
 * Escapes a single string field for RFC 4180 CSV compliance.
 * @param {any} val
 * @returns {string}
 */
export function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC 4180-compliant CSV string from decision records.
 * @param {Array<Object>} decisions
 * @returns {string}
 */
export function generateDecisionsCsv(decisions = []) {
  const headers = [
    'Decision ID',
    'Timestamp',
    'Batch ID',
    'Product Name',
    'Action Type',
    'Eligible',
    'Original Price (INR)',
    'Proposed Price (INR)',
    'Incremental Cost (INR)',
    'Unit Contribution (INR)',
    'Allocated Qty',
    'Unsold Qty',
    'Unmet Demand',
    'Total Contribution (INR)',
    'Manager',
    'Notes'
  ];

  const rows = decisions.map(d => [
    escapeCsvField(d.id),
    escapeCsvField(d.timestampFormatted || d.timestamp),
    escapeCsvField(d.batchId),
    escapeCsvField(d.productName),
    escapeCsvField(d.actionType || d.recommendedAction),
    escapeCsvField(d.eligible ? 'Yes' : 'No'),
    escapeCsvField(d.originalPrice),
    escapeCsvField(d.proposedPrice),
    escapeCsvField(d.incrementalCost),
    escapeCsvField(d.unitContribution),
    escapeCsvField(d.allocatedQuantity),
    escapeCsvField(d.unsoldQuantity),
    escapeCsvField(d.unmetDemand !== null ? d.unmetDemand : 'N/A'),
    escapeCsvField(d.totalContribution || d.approvedContribution),
    escapeCsvField(d.managerName || 'Demo Manager'),
    escapeCsvField(d.explanation || d.reason || '')
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * Triggers a browser file download of CSV or JSON content.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
