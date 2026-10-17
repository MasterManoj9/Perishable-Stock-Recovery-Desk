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

const KNOWN_GOOD_CONDITIONS = new Set(['good', 'intact', 'normal', 'acceptable', 'fresh', '']);
const KNOWN_DAMAGED_CONDITIONS = new Set(['damaged', 'compromised', 'spoiled', 'crushed', 'broken', 'leaking']);
const COLD_CHAIN_EXCEPTIONS = new Set(['exception', 'unresolved', 'alert', 'broken', 'breached', 'violated', 'failure']);

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
