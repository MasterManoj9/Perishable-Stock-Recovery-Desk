/**
 * allocation.test.js - Allocation Engine and Recommendation Integration Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allocateStock, DemandStatus } from '../domain/allocation.js';
import { generateRecommendation, ActionType } from '../domain/recommendations.js';

describe('Allocation Engine Tests', () => {
  describe('Demand Capping Both Directions', () => {
    it('Case A: Available stock 8, Supported demand 12 -> Allocates 8, Unsold 0, Unmet demand 4', () => {
      const res = allocateStock(8, 12);
      assert.strictEqual(res.allocatedQuantity, 8);
      assert.strictEqual(res.unsoldQuantity, 0);
      assert.strictEqual(res.unmetDemand, 4);
      assert.strictEqual(res.demandStatus, DemandStatus.EVIDENCED);
    });

    it('Case B: Available stock 12, Supported demand 8 -> Allocates 8, Unsold 4, Unmet demand 0', () => {
      const res = allocateStock(12, 8);
      assert.strictEqual(res.allocatedQuantity, 8);
      assert.strictEqual(res.unsoldQuantity, 4);
      assert.strictEqual(res.unmetDemand, 0);
      assert.strictEqual(res.demandStatus, DemandStatus.EVIDENCED);
    });

    it('Exact Match: Available 10, Demand 10 -> Allocates 10, Unsold 0, Unmet 0', () => {
      const res = allocateStock(10, 10);
      assert.strictEqual(res.allocatedQuantity, 10);
      assert.strictEqual(res.unsoldQuantity, 0);
      assert.strictEqual(res.unmetDemand, 0);
    });
  });

  describe('Missing or Zero Demand Scenarios', () => {
    it('handles missing demand evidence without fabricating demand (Allocates 0, retains stock)', () => {
      const res = allocateStock(15, null);
      assert.strictEqual(res.allocatedQuantity, 0);
      assert.strictEqual(res.unsoldQuantity, 15);
      assert.strictEqual(res.unmetDemand, null);
      assert.strictEqual(res.demandStatus, DemandStatus.UNKNOWN);
      assert.ok(res.demandExplanation.includes('missing or unevidenced'));
    });

    it('handles confirmed zero demand (Allocates 0, 15 unsold)', () => {
      const res = allocateStock(15, 0);
      assert.strictEqual(res.allocatedQuantity, 0);
      assert.strictEqual(res.unsoldQuantity, 15);
      assert.strictEqual(res.unmetDemand, 0);
      assert.strictEqual(res.demandStatus, DemandStatus.ZERO_DEMAND);
    });

    it('rejects negative stock or negative demand', () => {
      assert.throws(() => allocateStock(-5, 10));
      assert.throws(() => allocateStock(10, -5));
    });
  });
});

describe('Integrated Recommendation Engine Tests', () => {
  const refTime = '2026-10-18T12:00:00Z';

  it('approves markdown sale for eligible batch with valid economics and demand', () => {
    const batch = {
      id: 'B1',
      qty: 10,
      sale_price_inr: 40,
      incremental_cost_inr: 25,
      expired: false
    };

    const rec = generateRecommendation(batch, { proposedPrice: 40, supportedDemand: 10 }, { referenceTime: refTime });
    assert.strictEqual(rec.status, ActionType.RECOMMEND_MARKDOWN_SALE);
    assert.strictEqual(rec.eligible, true);
    assert.strictEqual(rec.allocatedQuantity, 10);
    assert.strictEqual(rec.unsoldQuantity, 0);
    assert.strictEqual(rec.unitContribution, 15);
    assert.strictEqual(rec.totalContribution, 150);
    assert.strictEqual(rec.approvedContribution, 150);
  });

  it('hard-blocks expired batch B2 even when proposed price yields high margin', () => {
    const batch = {
      id: 'B2',
      qty: 20,
      sale_price_inr: 50,
      incremental_cost_inr: 20,
      expired: true
    };

    // Even if manager simulates ₹50 selling price (₹30 margin!)
    const rec = generateRecommendation(batch, { proposedPrice: 50, supportedDemand: 20 }, { referenceTime: refTime });
    assert.strictEqual(rec.status, ActionType.BLOCK_SALE_DISPOSAL);
    assert.strictEqual(rec.eligible, false);
    assert.strictEqual(rec.allocatedQuantity, 0);
    assert.strictEqual(rec.approvedContribution, 0);
    assert.strictEqual(rec.unsoldQuantity, 20);
    assert.strictEqual(rec.potentialUnitMargin, 30); // Auditable, but not approved
    assert.ok(rec.explanation.includes('SALE BLOCKED'));
  });

  it('rejects proposed price that is below incremental cost (Negative Margin)', () => {
    const batch = {
      id: 'B_BELOW_COST',
      qty: 10,
      sale_price_inr: 40,
      incremental_cost_inr: 25,
      expired: false
    };

    // Proposed ₹20 which is below cost of ₹25
    const rec = generateRecommendation(batch, { proposedPrice: 20, supportedDemand: 10 }, { referenceTime: refTime });
    assert.strictEqual(rec.status, ActionType.PRICE_RULE_REJECTED);
    assert.strictEqual(rec.allocatedQuantity, 0);
    assert.strictEqual(rec.approvedContribution, 0);
    assert.ok(rec.explanation.includes('FINANCIAL RULE VIOLATION'));
  });

  it('holds stock when demand evidence is missing', () => {
    const batch = {
      id: 'B_NO_DEMAND',
      qty: 10,
      sale_price_inr: 40,
      incremental_cost_inr: 25,
      expired: false
    };

    const rec = generateRecommendation(batch, { proposedPrice: 40, supportedDemand: null }, { referenceTime: refTime });
    assert.strictEqual(rec.status, ActionType.NO_DEMAND_HOLD);
    assert.strictEqual(rec.allocatedQuantity, 0);
    assert.strictEqual(rec.unsoldQuantity, 10);
    assert.strictEqual(rec.totalContribution, 0);
  });
});
