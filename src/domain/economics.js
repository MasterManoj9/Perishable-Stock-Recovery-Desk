/**
 * economics.js - Pure Economics & Contribution Calculation Engine
 *
 * Implements:
 * - Unit Contribution: P_sell - C_inc
 * - Total Contribution: Unit Contribution * Q_allocated
 * - Allowed Markdown limits
 * - Minimum Contribution compliance
 * - Strict financial consistency and currency rounding (INR ₹)
 */

import { isNonNegativeNumber, isNonNegativeInteger } from './validation.js';

/**
 * Rounds a number to two decimal places for currency consistency.
 * @param {number} value
 * @returns {number}
 */
export function roundCurrency(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates contribution per unit.
 * Formula: sellingPrice - incrementalCost
 * 
 * @param {number} sellingPrice - Markdown or selling price in INR
 * @param {number} incrementalCost - Incremental recovery cost in INR
 * @returns {number}
 */
export function calculateUnitContribution(sellingPrice, incrementalCost) {
  if (!isNonNegativeNumber(sellingPrice) || !isNonNegativeNumber(incrementalCost)) {
    throw new Error('Selling price and incremental cost must be non-negative finite numbers');
  }
  return roundCurrency(sellingPrice - incrementalCost);
}

/**
 * Calculates total contribution for allocated units.
 * Formula: unitContribution * allocatedQuantity
 * 
 * Note: Must ONLY be computed for eligible, allocated units.
 * 
 * @param {number} unitContribution - Contribution per unit in INR
 * @param {number} allocatedQuantity - Quantity allocated for recovery sale
 * @returns {number}
 */
export function calculateTotalContribution(unitContribution, allocatedQuantity) {
  if (!Number.isFinite(unitContribution)) {
    throw new Error('Unit contribution must be a finite number');
  }
  if (!isNonNegativeInteger(allocatedQuantity)) {
    throw new Error('Allocated quantity must be a non-negative integer');
  }
  return roundCurrency(unitContribution * allocatedQuantity);
}

/**
 * Calculates discount percentage given original and proposed prices.
 * @param {number} originalPrice
 * @param {number} proposedPrice
 * @returns {number} Discount percentage (0-100)
 */
export function calculateDiscountPercent(originalPrice, proposedPrice) {
  if (!isNonNegativeNumber(originalPrice) || originalPrice === 0) return 0;
  if (!isNonNegativeNumber(proposedPrice)) return 0;
  if (proposedPrice >= originalPrice) return 0;

  const discount = ((originalPrice - proposedPrice) / originalPrice) * 100;
  return Math.round(discount * 100) / 100;
}

/**
 * Evaluates whether a proposed price respects the maximum allowed markdown limit.
 * 
 * @param {number} originalPrice 
 * @param {number} proposedPrice 
 * @param {number|null} allowedMarkdownPercent 
 * @returns {{ compliant: boolean, reason?: string, minAllowedPrice?: number }}
 */
export function checkAllowedMarkdownLimit(originalPrice, proposedPrice, allowedMarkdownPercent = null) {
  if (allowedMarkdownPercent === null || allowedMarkdownPercent === undefined) {
    return { compliant: true };
  }

  if (!isNonNegativeNumber(originalPrice) || !isNonNegativeNumber(proposedPrice)) {
    return { compliant: false, reason: 'Prices must be non-negative numbers' };
  }

  const minAllowedPrice = roundCurrency(originalPrice * (1 - allowedMarkdownPercent / 100));
  if (proposedPrice < minAllowedPrice) {
    return {
      compliant: false,
      minAllowedPrice,
      reason: `Proposed price ₹${proposedPrice} exceeds maximum allowed markdown of ${allowedMarkdownPercent}% (minimum allowed price: ₹${minAllowedPrice})`
    };
  }

  return { compliant: true, minAllowedPrice };
}

/**
 * Evaluates minimum contribution rule.
 * 
 * Configurable policy function:
 * - Default rule: Unit contribution must be non-negative (P >= C_inc).
 * - Optional store policy: Minimum unit contribution floor (e.g. ₹0, ₹5).
 * 
 * @param {number} unitContribution 
 * @param {Object} [policy={}] 
 * @param {number} [policy.minUnitContribution=0]
 * @returns {{ compliant: boolean, reason?: string }}
 */
export function checkMinimumContribution(unitContribution, policy = {}) {
  const minThreshold = policy.minUnitContribution !== undefined ? policy.minUnitContribution : 0;

  if (unitContribution < minThreshold) {
    return {
      compliant: false,
      reason: `Unit contribution (₹${unitContribution}) is below required minimum threshold of ₹${minThreshold}`
    };
  }

  return { compliant: true };
}
