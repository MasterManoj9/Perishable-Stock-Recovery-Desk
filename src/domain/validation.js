/**
 * validation.js - Strict input validation for C30 Perishable Stock Recovery Desk
 *
 * Implements non-negotiable data contracts:
 * - Quantities must be finite non-negative integers.
 * - Monetary figures (price, cost) must be finite non-negative numbers.
 * - Missing values: null means unknown, never coerced to 0.
 * - Explicit error reporting with machine-readable codes and human-readable messages.
 */

/**
 * Validates whether a value is a valid non-negative integer.
 * @param {*} value 
 * @returns {boolean}
 */
export function isNonNegativeInteger(value) {
  if (value === null || value === undefined || value === '') return false;
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 && Object.is(num, -0) === false;
}

/**
 * Validates whether a value is a valid non-negative finite number.
 * @param {*} value 
 * @returns {boolean}
 */
export function isNonNegativeNumber(value) {
  if (value === null || value === undefined || value === '') return false;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0;
}

/**
 * Validates an ISO timestamp or date-parseable string.
 * @param {*} value 
 * @returns {boolean}
 */
export function isValidTimestamp(value) {
  if (!value || typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

/**
 * Validates a batch record from raw fixture or user input.
 * Strict contract: does not silently mutate or coerce invalid inputs to zero.
 * 
 * @param {Object} batch
 * @returns {{ valid: boolean, errors: Array<{ field: string, code: string, message: string }> }}
 */
export function validateBatch(batch) {
  const errors = [];

  if (!batch || typeof batch !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'batch', code: 'INVALID_OBJECT', message: 'Batch must be a non-null object' }]
    };
  }

  // Batch ID
  if (!batch.id || typeof batch.id !== 'string' || batch.id.trim() === '') {
    errors.push({ field: 'id', code: 'MISSING_ID', message: 'Batch ID is required and must be a non-empty string' });
  }

  // Quantity on hand (qty)
  if (batch.qty === null || batch.qty === undefined) {
    errors.push({ field: 'qty', code: 'MISSING_QTY', message: 'Quantity is required (null represents unknown, not zero)' });
  } else if (!isNonNegativeInteger(batch.qty)) {
    errors.push({ field: 'qty', code: 'INVALID_QTY', message: 'Quantity must be a non-negative integer' });
  }

  // Sale Price (sale_price_inr or originalPrice)
  const price = batch.sale_price_inr !== undefined ? batch.sale_price_inr : batch.originalPrice;
  if (price === null || price === undefined) {
    errors.push({ field: 'sale_price_inr', code: 'MISSING_PRICE', message: 'Selling price is required' });
  } else if (!isNonNegativeNumber(price)) {
    errors.push({ field: 'sale_price_inr', code: 'INVALID_PRICE', message: 'Selling price must be a non-negative finite number' });
  }

  // Incremental Cost (incremental_cost_inr or incrementalCost)
  const cost = batch.incremental_cost_inr !== undefined ? batch.incremental_cost_inr : batch.incrementalCost;
  if (cost === null || cost === undefined) {
    errors.push({ field: 'incremental_cost_inr', code: 'MISSING_COST', message: 'Incremental cost is required' });
  } else if (!isNonNegativeNumber(cost)) {
    errors.push({ field: 'incremental_cost_inr', code: 'INVALID_COST', message: 'Incremental cost must be a non-negative finite number' });
  }

  // Expiry representation: boolean `expired` or ISO `expiryAt`
  const hasExpiredFlag = typeof batch.expired === 'boolean';
  const hasExpiryTimestamp = batch.expiryAt !== undefined && batch.expiryAt !== null;

  if (!hasExpiredFlag && !hasExpiryTimestamp) {
    errors.push({
      field: 'expiry',
      code: 'MISSING_EXPIRY_DATA',
      message: 'Batch must provide either a boolean expired flag or an ISO expiryAt timestamp'
    });
  } else if (hasExpiryTimestamp && !isValidTimestamp(batch.expiryAt)) {
    errors.push({
      field: 'expiryAt',
      code: 'INVALID_TIMESTAMP',
      message: `Invalid expiry timestamp format: "${batch.expiryAt}"`
    });
  }

  // Allowed Markdown % if provided
  const maxMarkdown = batch.allowed_markdown_percent !== undefined ? batch.allowed_markdown_percent : batch.allowedMarkdownPercent;
  if (maxMarkdown !== undefined && maxMarkdown !== null) {
    if (!isNonNegativeNumber(maxMarkdown) || maxMarkdown > 100) {
      errors.push({
        field: 'allowed_markdown_percent',
        code: 'INVALID_MARKDOWN_LIMIT',
        message: 'Allowed markdown percentage must be a number between 0 and 100'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates simulation parameters.
 * @param {Object} params
 * @param {number} originalPrice
 * @param {number} incrementalCost
 * @param {number|null} maxMarkdownPercent
 * @returns {{ valid: boolean, errors: Array<{ field: string, code: string, message: string }> }}
 */
export function validateSimulationParams(params, originalPrice, incrementalCost, maxMarkdownPercent = null) {
  const errors = [];

  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'params', code: 'INVALID_PARAMS', message: 'Simulation parameters must be an object' }]
    };
  }

  // Proposed selling price
  if (params.proposedPrice === null || params.proposedPrice === undefined) {
    errors.push({ field: 'proposedPrice', code: 'MISSING_PROPOSED_PRICE', message: 'Proposed selling price is required' });
  } else if (!isNonNegativeNumber(params.proposedPrice)) {
    errors.push({ field: 'proposedPrice', code: 'INVALID_PROPOSED_PRICE', message: 'Proposed selling price must be a non-negative number' });
  } else {
    // Check if proposed price exceeds original price
    if (isNonNegativeNumber(originalPrice) && params.proposedPrice > originalPrice) {
      errors.push({
        field: 'proposedPrice',
        code: 'PRICE_EXCEEDS_ORIGINAL',
        message: `Proposed markdown price (₹${params.proposedPrice}) cannot exceed original price (₹${originalPrice})`
      });
    }

    // Check allowed markdown limit if applicable
    if (maxMarkdownPercent !== null && maxMarkdownPercent !== undefined && isNonNegativeNumber(originalPrice)) {
      const minAllowedPrice = Math.round(originalPrice * (1 - maxMarkdownPercent / 100) * 100) / 100;
      if (params.proposedPrice < minAllowedPrice) {
        errors.push({
          field: 'proposedPrice',
          code: 'EXCEEDS_ALLOWED_MARKDOWN',
          message: `Proposed price ₹${params.proposedPrice} violates maximum allowed markdown of ${maxMarkdownPercent}% (minimum allowed price: ₹${minAllowedPrice})`
        });
      }
    }
  }

  // Supported Demand (optional in input, but if supplied must be non-negative integer)
  if (params.supportedDemand !== null && params.supportedDemand !== undefined) {
    if (!isNonNegativeInteger(params.supportedDemand)) {
      errors.push({
        field: 'supportedDemand',
        code: 'INVALID_SUPPORTED_DEMAND',
        message: 'Supported demand must be a non-negative integer'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Validates a decision record against the stable C30 schema version 1.0.0 contract.
 * 
 * Verifies:
 * - ID prefixed with 'DEC-' and valid schema version ('1.0.0').
 * - Valid ISO saved timestamp and non-empty decision status.
 * - Complete batch snapshot with starting stock, price, and cost.
 * - Scenario snapshot with valid proposed price and markdown details.
 * - Calculated outcome with demand allocation capped by stock.
 * - Safety Invariant: Expired or safety-blocked stock CANNOT be approved for markdown sale.
 * 
 * @param {Object} record
 * @returns {{ valid: boolean, errors: Array<{ field: string, code: string, message: string }> }}
 */
export function validateDecisionRecord(record) {
  const errors = [];

  if (!record || typeof record !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'record', code: 'INVALID_OBJECT', message: 'Decision record must be a non-null object' }]
    };
  }

  // 1. Identity
  if (!record.id || typeof record.id !== 'string' || !record.id.startsWith('DEC-')) {
    errors.push({ field: 'id', code: 'INVALID_DECISION_ID', message: 'Record ID must be a non-empty string prefixed with "DEC-"' });
  }

  const version = record.schemaVersion || '1.0.0';
  if (version !== CURRENT_SCHEMA_VERSION) {
    errors.push({
      field: 'schemaVersion',
      code: 'UNSUPPORTED_SCHEMA_VERSION',
      message: `Unsupported schema version: "${version}". Expected: "${CURRENT_SCHEMA_VERSION}"`
    });
  }

  const savedAt = record.savedAt || record.timestamp;
  if (!savedAt || !isValidTimestamp(savedAt)) {
    errors.push({ field: 'savedAt', code: 'INVALID_SAVED_AT', message: 'Record must contain a valid ISO timestamp' });
  }

  const status = record.decisionStatus || record.actionType;
  if (!status || typeof status !== 'string') {
    errors.push({ field: 'decisionStatus', code: 'MISSING_STATUS', message: 'Decision status or action type is required' });
  }

  // 2. Batch Snapshot (support both nested batchSnapshot and flattened backward-compatible roots)
  const batchId = record.batchSnapshot?.batchId || record.batchId;
  const startingQty = record.batchSnapshot?.startingQuantity !== undefined ? record.batchSnapshot.startingQuantity : record.qty;
  const originalPrice = record.batchSnapshot?.originalSellingPrice !== undefined ? record.batchSnapshot.originalSellingPrice : record.originalPrice;
  const cost = record.batchSnapshot?.incrementalCostPerUnit !== undefined ? record.batchSnapshot.incrementalCostPerUnit : record.incrementalCost;

  if (!batchId || typeof batchId !== 'string') {
    errors.push({ field: 'batchId', code: 'MISSING_BATCH_ID', message: 'Batch ID is required' });
  }

  if (startingQty !== undefined && !isNonNegativeInteger(startingQty)) {
    errors.push({ field: 'startingQuantity', code: 'INVALID_STARTING_QTY', message: 'Starting quantity must be a non-negative integer' });
  }

  if (originalPrice !== undefined && !isNonNegativeNumber(originalPrice)) {
    errors.push({ field: 'originalSellingPrice', code: 'INVALID_ORIGINAL_PRICE', message: 'Original selling price must be a non-negative number' });
  }

  if (cost !== undefined && !isNonNegativeNumber(cost)) {
    errors.push({ field: 'incrementalCostPerUnit', code: 'INVALID_INCREMENTAL_COST', message: 'Incremental cost must be a non-negative number' });
  }

  // 3. Scenario & Calculated Outcomes
  const proposedPrice = record.scenarioSnapshot?.proposedSellingPrice !== undefined ? record.scenarioSnapshot.proposedSellingPrice : record.proposedPrice;
  const allocatedQty = record.calculatedOutcome?.projectedQuantitySold !== undefined ? record.calculatedOutcome.projectedQuantitySold : record.allocatedQuantity;
  const unsoldQty = record.calculatedOutcome?.projectedUnsoldQuantity !== undefined ? record.calculatedOutcome.projectedUnsoldQuantity : record.unsoldQuantity;

  if (proposedPrice !== undefined && !isNonNegativeNumber(proposedPrice)) {
    errors.push({ field: 'proposedPrice', code: 'INVALID_PROPOSED_PRICE', message: 'Proposed price must be a non-negative number' });
  }

  if (allocatedQty !== undefined && !isNonNegativeInteger(allocatedQty)) {
    errors.push({ field: 'allocatedQuantity', code: 'INVALID_ALLOCATED_QTY', message: 'Allocated quantity must be a non-negative integer' });
  }

  if (startingQty !== undefined && allocatedQty !== undefined && allocatedQty > startingQty) {
    errors.push({ field: 'allocatedQuantity', code: 'ALLOCATED_EXCEEDS_STOCK', message: 'Allocated quantity cannot exceed starting batch stock' });
  }

  if (unsoldQty !== undefined && !isNonNegativeInteger(unsoldQty)) {
    errors.push({ field: 'unsoldQuantity', code: 'INVALID_UNSOLD_QTY', message: 'Unsold quantity must be a non-negative integer' });
  }

  // 4. Strict Safety Invariant
  // If batch is expired or marked ineligible, record CANNOT have approved markdown sale status or allocate units for sale
  const isExpired = Boolean(record.batchSnapshot?.isExpired || record.expired);
  const isEligible = record.calculatedOutcome?.eligibilityResult?.eligible !== undefined
    ? record.calculatedOutcome.eligibilityResult.eligible
    : record.eligible;

  const isApprovedSaleStatus = status === 'APPROVED_MARKDOWN' || status === 'RECOMMEND_MARKDOWN_SALE';

  if ((isExpired || isEligible === false) && isApprovedSaleStatus) {
    errors.push({
      field: 'decisionStatus',
      code: 'SAFETY_VIOLATION_APPROVED_SALE',
      message: 'Safety rule violation: Expired or ineligible stock cannot be recorded as an approved markdown sale'
    });
  }

  if ((isExpired || isEligible === false) && allocatedQty > 0) {
    errors.push({
      field: 'allocatedQuantity',
      code: 'SAFETY_VIOLATION_ALLOCATION',
      message: 'Safety rule violation: Ineligible stock cannot allocate non-zero units for sale'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
