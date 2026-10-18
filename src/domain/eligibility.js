/**
 * eligibility.js - Centralized Food-Safety & Stock Eligibility Engine
 *
 * Enforces non-negotiable food safety gates before economic calculations:
 * 1. Expired batches are hard-blocked from sale (sellableQuantity = 0).
 * 2. Damaged stock is hard-blocked from sale.
 * 3. Unresolved cold-chain exceptions require inspection and are blocked from sale.
 * 4. Missing safety data requires review and is blocked from sale.
 * 5. Uses deterministic, injectable reference timestamps for test reproducibility.
 */

import { validateBatch, isValidTimestamp } from './validation.js';

export const EligibilityStatus = {
  ELIGIBLE: 'ELIGIBLE',
  EXPIRED: 'EXPIRED',
  DAMAGED: 'DAMAGED',
  COLD_CHAIN_REVIEW: 'COLD_CHAIN_REVIEW',
  MISSING_DATA: 'MISSING_DATA',
  INVALID_RECORD: 'INVALID_RECORD'
};

export const ExpiryStatus = {
  FRESH: 'FRESH',
  NEAR_EXPIRY: 'NEAR_EXPIRY',
  EXPIRED: 'EXPIRED',
  UNKNOWN: 'UNKNOWN'
};

const KNOWN_GOOD_CONDITIONS = new Set(['good', 'intact', 'normal', 'acceptable', 'fresh', '']);
const KNOWN_DAMAGED_CONDITIONS = new Set(['damaged', 'compromised', 'spoiled', 'crushed', 'broken', 'leaking']);
const COLD_CHAIN_EXCEPTIONS = new Set(['exception', 'unresolved', 'alert', 'broken', 'breached', 'violated', 'failure']);

/**
 * Calculates calendar days remaining until expiry.
 * Safe across timezones, midnight boundaries, ISO timestamps, and date-only YYYY-MM-DD strings.
 *
 * @param {string|Date|number} expiryInput - Expiry date/timestamp.
 * @param {string|Date|number} [referenceInput=new Date()] - Reference point (defaults to now).
 * @returns {number|null} Days remaining (can be 0 or negative), or null if missing/invalid.
 */
export function calculateCalendarDaysRemaining(expiryInput, referenceInput = new Date()) {
  if (expiryInput === null || expiryInput === undefined || expiryInput === '') return null;
  const refDate = referenceInput instanceof Date ? referenceInput : new Date(referenceInput);
  if (isNaN(refDate.getTime())) return null;

  let expYear, expMonth, expDate;
  if (typeof expiryInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expiryInput.trim())) {
    const parts = expiryInput.trim().split('-');
    expYear = parseInt(parts[0], 10);
    expMonth = parseInt(parts[1], 10) - 1;
    expDate = parseInt(parts[2], 10);
  } else {
    const expObj = expiryInput instanceof Date ? expiryInput : new Date(expiryInput);
    if (isNaN(expObj.getTime())) return null;
    expYear = expObj.getUTCFullYear();
    expMonth = expObj.getUTCMonth();
    expDate = expObj.getUTCDate();
  }

  const utcRef = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate());
  const utcExp = Date.UTC(expYear, expMonth, expDate);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utcExp - utcRef) / MS_PER_DAY);
}

/**
 * Reusable Expiry Classification function enforcing C30 business rules:
 * - Missing or invalid expiry -> UNKNOWN, gray/slate, blocked from sale
 * - Expiry date today or in past (days <= 0) -> EXPIRED, red, not saleable
 * - 1 to 10 days remaining -> NEAR_EXPIRY, yellow, saleable
 * - More than 10 days remaining -> FRESH, green, saleable
 *
 * @param {Object|string|Date} batchOrExpiry
 * @param {string|Date|number} [referenceTime=new Date()]
 * @returns {{
 *   status: 'FRESH'|'NEAR_EXPIRY'|'EXPIRED'|'UNKNOWN',
 *   label: string,
 *   badgeColor: 'green'|'yellow'|'red'|'slate',
 *   daysRemaining: number|null,
 *   saleable: boolean,
 *   reason: string
 * }}
 */
export function classifyExpiry(batchOrExpiry, referenceTime = new Date()) {
  let expiryInput = batchOrExpiry;
  if (batchOrExpiry && typeof batchOrExpiry === 'object') {
    if (batchOrExpiry.expired === true) {
      return {
        status: ExpiryStatus.EXPIRED,
        label: 'Expired',
        badgeColor: 'red',
        daysRemaining: 0,
        saleable: false,
        reason: 'Batch is flagged as expired. Not saleable.'
      };
    }
    expiryInput = batchOrExpiry.expiryAt || batchOrExpiry.expiry_at || batchOrExpiry.expiryDate || batchOrExpiry.expiry;
    if (expiryInput === null || expiryInput === undefined) {
      if (typeof batchOrExpiry.daysUntilExpiry === 'number') {
        const days = batchOrExpiry.daysUntilExpiry;
        if (days <= 0) {
          return {
            status: ExpiryStatus.EXPIRED,
            label: 'Expired',
            badgeColor: 'red',
            daysRemaining: days,
            saleable: false,
            reason: 'Expiry date is today or in the past. Expired for saleability purposes.'
          };
        } else if (days <= 10) {
          return {
            status: ExpiryStatus.NEAR_EXPIRY,
            label: 'Near to Expiry',
            badgeColor: 'yellow',
            daysRemaining: days,
            saleable: true,
            reason: `${days} day${days > 1 ? 's' : ''} remaining until expiry.`
          };
        } else {
          return {
            status: ExpiryStatus.FRESH,
            label: 'Fresh',
            badgeColor: 'green',
            daysRemaining: days,
            saleable: true,
            reason: `${days} days remaining until expiry.`
          };
        }
      }
    }
  }

  const days = calculateCalendarDaysRemaining(expiryInput, referenceTime);

  if (days === null) {
    return {
      status: ExpiryStatus.UNKNOWN,
      label: 'Unknown / Unverified',
      badgeColor: 'slate',
      daysRemaining: null,
      saleable: false,
      reason: 'Missing or invalid expiry date. Sale blocked until verified.'
    };
  }

  if (days <= 0) {
    return {
      status: ExpiryStatus.EXPIRED,
      label: 'Expired',
      badgeColor: 'red',
      daysRemaining: days,
      saleable: false,
      reason: days === 0
        ? 'Expiry date is today. Expired for saleability purposes.'
        : `Expired ${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} ago.`
    };
  }

  if (days <= 10) {
    return {
      status: ExpiryStatus.NEAR_EXPIRY,
      label: 'Near to Expiry',
      badgeColor: 'yellow',
      daysRemaining: days,
      saleable: true,
      reason: `${days} day${days > 1 ? 's' : ''} remaining until expiry.`
    };
  }

  return {
    status: ExpiryStatus.FRESH,
    label: 'Fresh',
    badgeColor: 'green',
    daysRemaining: days,
    saleable: true,
    reason: `${days} days remaining until expiry.`
  };
}

/**
 * Comprehensive saleability check enforcing all C30 food-safety and business rules.
 * Expiry classification alone is not sufficient; all gates must pass.
 *
 * @param {Object} batch
 * @param {string|Date|number} [referenceTime=new Date()]
 * @returns {{
 *   saleable: boolean,
 *   reason: string,
 *   gate: 'EXPIRY'|'COLD_CHAIN'|'DAMAGE'|'STOCK'|'RECORD'|'PASSED'
 * }}
 */
export function isSaleable(batch, referenceTime = new Date()) {
  if (!batch || typeof batch !== 'object') {
    return { saleable: false, reason: 'Invalid or missing batch record.', gate: 'RECORD' };
  }

  // 1. Check Cold-Chain Exception (Takes non-negotiable precedence over all other factors)
  const coldChainRaw = batch.cold_chain_status || batch.coldChainStatus || batch.cold_chain;
  const coldChain = String(coldChainRaw || '').toLowerCase().trim();
  if (COLD_CHAIN_EXCEPTIONS.has(coldChain)) {
    return {
      saleable: false,
      reason: 'Sale blocked: unresolved cold-chain exception. A valid expiry date does not establish product safety.',
      gate: 'COLD_CHAIN'
    };
  }

  // 2. Check Physical Damage / Condition
  const condition = String(batch.condition || '').toLowerCase().trim();
  if (batch.damaged === true || KNOWN_DAMAGED_CONDITIONS.has(condition)) {
    return {
      saleable: false,
      reason: 'Stock is damaged or packaging is compromised. Strictly blocked from sale.',
      gate: 'DAMAGE'
    };
  }

  // 3. Check Expiry Classification
  const expiry = classifyExpiry(batch, referenceTime);
  if (!expiry.saleable) {
    return {
      saleable: false,
      reason: expiry.reason,
      gate: 'EXPIRY'
    };
  }

  // 4. Check Stock Availability
  const qty = Number(batch.qty !== undefined ? batch.qty : batch.available_quantity);
  if (isNaN(qty) || qty <= 0) {
    return {
      saleable: false,
      reason: 'Stock quantity is zero or sold out.',
      gate: 'STOCK'
    };
  }

  // 5. Check Soft-Deletion / Archival
  if (batch.deleted_at) {
    return {
      saleable: false,
      reason: 'Batch has been archived or deleted from active inventory.',
      gate: 'RECORD'
    };
  }

  // 6. Passed all gates
  return {
    saleable: true,
    reason: 'Batch is verified safe and eligible for sale.',
    gate: 'PASSED'
  };
}

/**
 * Checks stock eligibility for a given batch.
 * 
 * @param {Object} batch - The raw or normalized inventory batch.
 * @param {string|number|Date} [referenceTime=Date.now()] - Reference time for deterministic boundary testing.
 * @returns {{
 *   eligible: boolean,
 *   sellableQuantity: number,
 *   status: string,
 *   reason: string,
 *   requiresReview: boolean
 * }}
 */
export function checkEligibility(batch, referenceTime = Date.now()) {
  // 1. Basic record validation
  const validation = validateBatch(batch);
  if (!validation.valid) {
    return {
      eligible: false,
      sellableQuantity: 0,
      status: EligibilityStatus.INVALID_RECORD,
      reason: `Batch record failed validation: ${validation.errors.map(e => e.message).join('; ')}`,
      requiresReview: true
    };
  }

  // Safe reference time normalization
  const refDate = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
  const refMs = isNaN(refDate.getTime()) ? Date.now() : refDate.getTime();

  // 2. Check expiry boundary (both boolean flag from fixture and ISO timestamp)
  // Direct boolean check (from official fixture B2)
  if (batch.expired === true) {
    return {
      eligible: false,
      sellableQuantity: 0,
      status: EligibilityStatus.EXPIRED,
      reason: 'Batch has reached or passed its expiry boundary. Strictly blocked from sale under food-safety regulations.',
      requiresReview: false
    };
  }

  // Timestamp boundary evaluation if expiryAt provided
  if (batch.expiryAt !== undefined && batch.expiryAt !== null) {
    if (!isValidTimestamp(batch.expiryAt)) {
      return {
        eligible: false,
        sellableQuantity: 0,
        status: EligibilityStatus.MISSING_DATA,
        reason: 'Invalid expiry timestamp provided. Stock blocked until verified.',
        requiresReview: true
      };
    }

    const expiryMs = new Date(batch.expiryAt).getTime();

    // Expiry rule: at or after expiry boundary timestamp, stock is expired (refMs >= expiryMs)
    if (refMs >= expiryMs) {
      return {
        eligible: false,
        sellableQuantity: 0,
        status: EligibilityStatus.EXPIRED,
        reason: `Batch expired on ${new Date(expiryMs).toISOString()} (Reference time: ${new Date(refMs).toISOString()}). Blocked from sale.`,
        requiresReview: false
      };
    }
  }

  // 3. Check stock condition (Damage gate)
  const condition = String(batch.condition || '').toLowerCase().trim();
  const isDamaged = batch.damaged === true || KNOWN_DAMAGED_CONDITIONS.has(condition);
  if (isDamaged) {
    return {
      eligible: false,
      sellableQuantity: 0,
      status: EligibilityStatus.DAMAGED,
      reason: 'Stock is damaged or packaging is compromised. Strictly blocked from recovery sale.',
      requiresReview: false
    };
  }

  if (condition && !KNOWN_GOOD_CONDITIONS.has(condition)) {
    return {
      eligible: false,
      sellableQuantity: 0,
      status: EligibilityStatus.COLD_CHAIN_REVIEW,
      reason: `Unrecognized stock condition "${batch.condition}". Stock blocked pending quality inspection.`,
      requiresReview: true
    };
  }

  // 4. Check cold-chain status
  const coldChainRaw = batch.cold_chain_status || batch.coldChainStatus || batch.cold_chain;
  const coldChain = String(coldChainRaw || '').toLowerCase().trim();

  if (COLD_CHAIN_EXCEPTIONS.has(coldChain)) {
    return {
      eligible: false,
      sellableQuantity: 0,
      status: EligibilityStatus.COLD_CHAIN_REVIEW,
      reason: 'Unresolved cold-chain temperature exception. Stock blocked pending food-safety supervisor clearance.',
      requiresReview: true
    };
  }

  // Missing cold-chain evidence when explicitly required
  const requiresColdChain = batch.requiresColdChain === true || batch.requires_cold_chain === true;
  if (requiresColdChain && (!coldChain || coldChain === 'missing' || coldChain === 'unrecorded' || coldChain === 'unknown')) {
    return {
      eligible: false,
      sellableQuantity: 0,
      status: EligibilityStatus.COLD_CHAIN_REVIEW,
      reason: 'Missing cold-chain verification records. Perishable item blocked pending temperature log verification.',
      requiresReview: true
    };
  }

  // 5. Passed all safety gates
  return {
    eligible: true,
    sellableQuantity: batch.qty,
    status: EligibilityStatus.ELIGIBLE,
    reason: 'Batch passed all food-safety, condition, cold-chain, and expiry checks.',
    requiresReview: false
  };
}
