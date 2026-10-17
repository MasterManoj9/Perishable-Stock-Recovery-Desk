/**
 * eligibility.test.js - Comprehensive Food Safety & Stock Eligibility Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility, EligibilityStatus } from '../domain/eligibility.js';

describe('Stock Eligibility Engine Tests', () => {
  const refTime = '2026-10-18T12:00:00Z';

  it('marks eligible batch as ELIGIBLE with sellableQuantity equal to batch qty', () => {
    const batch = {
      id: 'B_GOOD',
      qty: 15,
      sale_price_inr: 40,
      incremental_cost_inr: 25,
      expired: false,
      condition: 'good',
      cold_chain_status: 'ok'
    };
    const res = checkEligibility(batch, refTime);
    assert.strictEqual(res.eligible, true);
    assert.strictEqual(res.sellableQuantity, 15);
    assert.strictEqual(res.status, EligibilityStatus.ELIGIBLE);
    assert.strictEqual(res.requiresReview, false);
  });

  it('blocks batch with boolean expired: true (Official fixture B2)', () => {
    const batch = {
      id: 'B2',
      qty: 20,
      sale_price_inr: 50,
      incremental_cost_inr: 20,
      expired: true
    };
    const res = checkEligibility(batch, refTime);
    assert.strictEqual(res.eligible, false);
    assert.strictEqual(res.sellableQuantity, 0);
    assert.strictEqual(res.status, EligibilityStatus.EXPIRED);
    assert.ok(res.reason.includes('boundary') || res.reason.includes('expired'));
  });

  describe('Deterministic Expiry Boundary Tests (ISO timestamp)', () => {
    it('allows stock BEFORE expiry boundary', () => {
      const batch = {
        id: 'B_BEFORE',
        qty: 10,
        sale_price_inr: 40,
        incremental_cost_inr: 20,
        expiryAt: '2026-10-18T13:00:00Z' // 1 hour in the future
      };
      const res = checkEligibility(batch, refTime);
      assert.strictEqual(res.eligible, true);
      assert.strictEqual(res.sellableQuantity, 10);
    });

    it('blocks stock EXACTLY AT expiry boundary (referenceTime === expiryAt)', () => {
      const batch = {
        id: 'B_EXACT',
        qty: 10,
        sale_price_inr: 40,
        incremental_cost_inr: 20,
        expiryAt: '2026-10-18T12:00:00Z' // Exactly matching referenceTime
      };
      const res = checkEligibility(batch, refTime);
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.sellableQuantity, 0);
      assert.strictEqual(res.status, EligibilityStatus.EXPIRED);
    });

    it('blocks stock AFTER expiry boundary', () => {
      const batch = {
        id: 'B_AFTER',
        qty: 10,
        sale_price_inr: 40,
        incremental_cost_inr: 20,
        expiryAt: '2026-10-18T11:00:00Z' // 1 hour past
      };
      const res = checkEligibility(batch, refTime);
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.sellableQuantity, 0);
      assert.strictEqual(res.status, EligibilityStatus.EXPIRED);
    });
  });

  describe('Damaged Stock Gate', () => {
    it('blocks damaged stock even if unexpired', () => {
      const batch = {
        id: 'B_DAMAGED',
        qty: 8,
        sale_price_inr: 30,
        incremental_cost_inr: 10,
        expired: false,
        condition: 'damaged'
      };
      const res = checkEligibility(batch, refTime);
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.sellableQuantity, 0);
      assert.strictEqual(res.status, EligibilityStatus.DAMAGED);
      assert.ok(res.reason.includes('damaged') || res.reason.includes('compromised'));
    });
  });

  describe('Cold-Chain Exception Gate', () => {
    it('blocks stock with cold-chain exception and flags for review', () => {
      const batch = {
        id: 'B_COLD',
        qty: 12,
        sale_price_inr: 60,
        incremental_cost_inr: 30,
        expired: false,
        cold_chain_status: 'exception'
      };
      const res = checkEligibility(batch, refTime);
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.sellableQuantity, 0);
      assert.strictEqual(res.status, EligibilityStatus.COLD_CHAIN_REVIEW);
      assert.strictEqual(res.requiresReview, true);
    });
  });

  describe('Immutability Guarantee', () => {
    it('does not mutate the input batch object', () => {
      const original = { id: 'B_IMMUTABLE', qty: 10, sale_price_inr: 40, incremental_cost_inr: 25, expired: false };
      const clone = JSON.parse(JSON.stringify(original));
      checkEligibility(original, refTime);
      assert.deepStrictEqual(original, clone);
    });
  });
});
