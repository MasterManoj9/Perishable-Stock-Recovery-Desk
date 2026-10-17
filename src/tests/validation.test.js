/**
 * validation.test.js - Comprehensive Input & Fixture Validation Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNonNegativeInteger,
  isNonNegativeNumber,
  isValidTimestamp,
  validateBatch,
  validateSimulationParams
} from '../domain/validation.js';

describe('Validation Engine Tests', () => {
  describe('isNonNegativeInteger', () => {
    it('accepts valid non-negative integers', () => {
      assert.strictEqual(isNonNegativeInteger(0), true);
      assert.strictEqual(isNonNegativeInteger(10), true);
      assert.strictEqual(isNonNegativeInteger('25'), true);
    });

    it('rejects negative numbers, decimals, non-numbers, and null', () => {
      assert.strictEqual(isNonNegativeInteger(-1), false);
      assert.strictEqual(isNonNegativeInteger(10.5), false);
      assert.strictEqual(isNonNegativeInteger(null), false);
      assert.strictEqual(isNonNegativeInteger(undefined), false);
      assert.strictEqual(isNonNegativeInteger('abc'), false);
      assert.strictEqual(isNonNegativeInteger(NaN), false);
      assert.strictEqual(isNonNegativeInteger(Infinity), false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it('accepts valid non-negative numbers including decimals', () => {
      assert.strictEqual(isNonNegativeNumber(0), true);
      assert.strictEqual(isNonNegativeNumber(25.75), true);
      assert.strictEqual(isNonNegativeNumber('40'), true);
    });

    it('rejects negative numbers, null, NaN, and Infinity', () => {
      assert.strictEqual(isNonNegativeNumber(-5), false);
      assert.strictEqual(isNonNegativeNumber(null), false);
      assert.strictEqual(isNonNegativeNumber(NaN), false);
      assert.strictEqual(isNonNegativeNumber(Infinity), false);
    });
  });

  describe('isValidTimestamp', () => {
    it('validates ISO-8601 timestamps', () => {
      assert.strictEqual(isValidTimestamp('2026-10-18T12:00:00Z'), true);
      assert.strictEqual(isValidTimestamp('2026-10-18'), true);
    });

    it('rejects invalid timestamp strings', () => {
      assert.strictEqual(isValidTimestamp('invalid-date'), false);
      assert.strictEqual(isValidTimestamp(null), false);
      assert.strictEqual(isValidTimestamp(''), false);
    });
  });

  describe('validateBatch', () => {
    it('validates official fixture batch B1 correctly', () => {
      const b1 = { id: 'B1', qty: 10, sale_price_inr: 40, incremental_cost_inr: 25, expired: false };
      const res = validateBatch(b1);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    it('rejects negative quantity', () => {
      const batch = { id: 'B_NEG', qty: -5, sale_price_inr: 40, incremental_cost_inr: 25, expired: false };
      const res = validateBatch(batch);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.field === 'qty'));
    });

    it('rejects fractional quantity', () => {
      const batch = { id: 'B_FRAC', qty: 5.5, sale_price_inr: 40, incremental_cost_inr: 25, expired: false };
      const res = validateBatch(batch);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.field === 'qty'));
    });

    it('rejects null quantity (null means unknown, never coerced to 0)', () => {
      const batch = { id: 'B_NULL', qty: null, sale_price_inr: 40, incremental_cost_inr: 25, expired: false };
      const res = validateBatch(batch);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.field === 'qty'));
    });

    it('rejects negative price and cost', () => {
      const batch = { id: 'B_BAD', qty: 10, sale_price_inr: -40, incremental_cost_inr: -25, expired: false };
      const res = validateBatch(batch);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.field === 'sale_price_inr'));
      assert.ok(res.errors.some(e => e.field === 'incremental_cost_inr'));
    });

    it('rejects missing expiry representation', () => {
      const batch = { id: 'B_NO_EXP', qty: 10, sale_price_inr: 40, incremental_cost_inr: 25 };
      const res = validateBatch(batch);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.code === 'MISSING_EXPIRY_DATA'));
    });
  });

  describe('validateSimulationParams', () => {
    it('rejects proposed price exceeding original price', () => {
      const res = validateSimulationParams({ proposedPrice: 60 }, 50, 20);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.code === 'PRICE_EXCEEDS_ORIGINAL'));
    });

    it('rejects proposed price violating maximum allowed markdown', () => {
      // Original 100, max markdown 30% -> min allowed price 70. Proposed: 60.
      const res = validateSimulationParams({ proposedPrice: 60 }, 100, 20, 30);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.code === 'EXCEEDS_ALLOWED_MARKDOWN'));
    });

    it('accepts compliant markdown price', () => {
      const res = validateSimulationParams({ proposedPrice: 75 }, 100, 20, 30);
      assert.strictEqual(res.valid, true);
    });
  });
});
