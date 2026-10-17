/**
 * reliabilityEdgeCases.test.js - Module 5 Comprehensive Edge-Case & Reliability Test Suite
 *
 * Verifies:
 * 1. Expiry boundary correctness (before, exact, after, timezone-aware, invalid, missing)
 * 2. Cold-chain exception handling & missing records
 * 3. Damaged stock conditions & suspicious condition handling
 * 4. Missing, zero, and excess demand evidence handling
 * 5. Strict separation between theoretical margin and approved recovery recommendation
 * 6. Financial calculation reliability (no double counting, exact rounding)
 * 7. Persistence error resilience & non-destructive recovery
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility, EligibilityStatus } from '../domain/eligibility.js';
import { generateRecommendation, ActionType } from '../domain/recommendations.js';
import { allocateStock, DemandStatus } from '../domain/allocation.js';
import {
  calculateUnitContribution,
  calculateTotalContribution,
  roundCurrency
} from '../domain/economics.js';
import {
  validateBatch,
  validateSimulationParams,
  validateDecisionRecord,
  CURRENT_SCHEMA_VERSION
} from '../domain/validation.js';
import {
  createDecisionRecord,
  saveDecision,
  getStoredDecisions,
  clearStoredDecisions,
  DECISIONS_STORAGE_KEY
} from '../data/decisionStore.js';

describe('Module 5: Reliability, Edge Cases, and Business Feedback Tests', () => {
  const FIXED_REF_TIME = '2026-10-18T12:00:00.000Z';
  const FIXED_REF_MS = new Date(FIXED_REF_TIME).getTime();

  // Mock window.localStorage for persistence tests
  let storageMap = {};

  beforeEach(() => {
    storageMap = {};
    globalThis.window = {
      localStorage: {
        getItem: (k) => storageMap[k] ?? null,
        setItem: (k, v) => { storageMap[k] = String(v); },
        removeItem: (k) => { delete storageMap[k]; },
        clear: () => { storageMap = {}; }
      }
    };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  // Base test batches
  const baseEligibleBatch = {
    id: 'BATCH_ELIGIBLE',
    productName: 'Fresh Pasteurized Whole Milk',
    qty: 10,
    sale_price_inr: 40,
    incremental_cost_inr: 25,
    expired: false,
    expiryAt: '2026-10-25T12:00:00Z',
    condition: 'good',
    cold_chain_status: 'normal'
  };

  describe('1. Expiry Boundary Correctness Tests', () => {
    test('1ms BEFORE expiry boundary: stock remains eligible and sellable', () => {
      const boundaryBatch = {
        ...baseEligibleBatch,
        id: 'B_1MS_BEFORE',
        expiryAt: new Date(FIXED_REF_MS + 1).toISOString() // 1 millisecond into the future
      };

      const result = checkEligibility(boundaryBatch, FIXED_REF_TIME);
      assert.equal(result.eligible, true);
      assert.equal(result.sellableQuantity, 10);
      assert.equal(result.status, EligibilityStatus.ELIGIBLE);
    });

    test('EXACTLY AT expiry boundary (referenceTime === expiryAt): stock is strictly expired', () => {
      const boundaryBatch = {
        ...baseEligibleBatch,
        id: 'B_EXACT_BOUNDARY',
        expiryAt: FIXED_REF_TIME // Exactly matches referenceTime
      };

      const result = checkEligibility(boundaryBatch, FIXED_REF_TIME);
      assert.equal(result.eligible, false);
      assert.equal(result.sellableQuantity, 0);
      assert.equal(result.status, EligibilityStatus.EXPIRED);
      assert.ok(result.reason.includes('expired'));
    });

    test('1ms AFTER expiry boundary: stock is strictly expired', () => {
      const boundaryBatch = {
        ...baseEligibleBatch,
        id: 'B_1MS_AFTER',
        expiryAt: new Date(FIXED_REF_MS - 1).toISOString() // 1 millisecond in the past
      };

      const result = checkEligibility(boundaryBatch, FIXED_REF_TIME);
      assert.equal(result.eligible, false);
      assert.equal(result.sellableQuantity, 0);
      assert.equal(result.status, EligibilityStatus.EXPIRED);
    });

    test('Timezone-aware ISO-8601 boundary: verifies +05:30 offset matches UTC instant', () => {
      // 17:30:00+05:30 is exactly 12:00:00.000Z UTC
      const istBatch = {
        ...baseEligibleBatch,
        id: 'B_IST_BOUNDARY',
        expiryAt: '2026-10-18T17:30:00.000+05:30'
      };

      // Reference time in UTC matching the exact same instant
      const result = checkEligibility(istBatch, '2026-10-18T12:00:00.000Z');
      assert.equal(result.eligible, false);
      assert.equal(result.sellableQuantity, 0);
      assert.equal(result.status, EligibilityStatus.EXPIRED);
    });

    test('Invalid expiry timestamp string is blocked from sale with sellable quantity 0', () => {
      const invalidTimestampBatch = {
        ...baseEligibleBatch,
        id: 'B_INVALID_TIMESTAMP',
        expiryAt: 'not-a-date'
      };

      const result = checkEligibility(invalidTimestampBatch, FIXED_REF_TIME);
      assert.equal(result.eligible, false);
      assert.equal(result.sellableQuantity, 0);
      assert.ok(
        result.status === EligibilityStatus.INVALID_RECORD ||
        result.status === EligibilityStatus.MISSING_DATA
      );
      assert.ok(result.reason.toLowerCase().includes('invalid expiry timestamp') || result.reason.includes('INVALID_TIMESTAMP'));
    });

    test('Missing expiry representation rejected during batch validation', () => {
      const noExpiryBatch = {
        id: 'B_NO_EXPIRY',
        qty: 10,
        sale_price_inr: 40,
        incremental_cost_inr: 25
      };

      const val = validateBatch(noExpiryBatch);
      assert.equal(val.valid, false);
      assert.ok(val.errors.some(e => e.code === 'MISSING_EXPIRY_DATA'));

      const elig = checkEligibility(noExpiryBatch, FIXED_REF_TIME);
      assert.equal(elig.eligible, false);
      assert.equal(elig.status, EligibilityStatus.INVALID_RECORD);
    });
  });

  describe('2. Business Feedback Improvement: Strict Safety Precedence Over Margin', () => {
    test('Expired batch B2 with highly attractive margin (+₹30) is strictly blocked with zero contribution', () => {
      const expiredAttractiveBatch = {
        id: 'B2_ATTRACTIVE',
        productName: 'Artisan Sourdough Loaf',
        qty: 20,
        sale_price_inr: 50,
        incremental_cost_inr: 20,
        expired: true,
        expiryAt: '2026-10-15T00:00:00Z'
      };

      // Proposed price 50, cost 20 -> superficial margin = +30/unit
      const rec = generateRecommendation(expiredAttractiveBatch, {
        proposedPrice: 50,
        supportedDemand: 10
      });

      assert.equal(rec.eligible, false);
      assert.equal(rec.allocatedQuantity, 0);
      assert.equal(rec.unitContribution, 0);
      assert.equal(rec.totalContribution, 0);
      assert.equal(rec.approvedContribution, 0);
      assert.equal(rec.recommendedAction, ActionType.BLOCK_SALE_DISPOSAL);
      assert.equal(rec.potentialUnitMargin, 30); // Explanatory only
      assert.ok(rec.explanation.includes('Attractive margins cannot bypass food safety'));
    });

    test('Safety gate prevents expired batch from ever being saved as approved markdown', () => {
      const expiredBatch = {
        id: 'B2',
        productName: 'Sourdough',
        qty: 20,
        sale_price_inr: 50,
        incremental_cost_inr: 20,
        expired: true
      };
      const rec = generateRecommendation(expiredBatch, { proposedPrice: 50, supportedDemand: 10 });
      const record = createDecisionRecord({ batch: expiredBatch, recommendation: rec });

      // Automatically categorized as BLOCKED_DISPOSAL
      assert.equal(record.decisionStatus, 'BLOCKED_DISPOSAL');
      assert.equal(record.calculatedOutcome.projectedQuantitySold, 0);
      assert.equal(record.calculatedOutcome.projectedContribution, 0);

      // Validation verifies safety invariant
      const val = validateDecisionRecord(record);
      assert.equal(val.valid, true);

      // If malicious or buggy client tries to mark it as approved
      record.decisionStatus = 'APPROVED_MARKDOWN';
      const invalidVal = validateDecisionRecord(record);
      assert.equal(invalidVal.valid, false);
      assert.ok(invalidVal.errors.some(e => e.code === 'SAFETY_VIOLATION_APPROVED_SALE'));
    });
  });

  describe('3. Cold-Chain Exceptions & Missing Records', () => {
    test('Compliant cold-chain batch follows normal recovery rules', () => {
      const compliantBatch = {
        ...baseEligibleBatch,
        id: 'B_COLD_OK',
        cold_chain_status: 'normal'
      };
      const result = checkEligibility(compliantBatch, FIXED_REF_TIME);
      assert.equal(result.eligible, true);
      assert.equal(result.sellableQuantity, 10);
      assert.equal(result.status, EligibilityStatus.ELIGIBLE);
    });

    test('Explicit cold-chain exceptions (broken, breached, exception) route to COLD_CHAIN_REVIEW', () => {
      for (const status of ['exception', 'unresolved', 'alert', 'broken', 'breached', 'violated']) {
        const batch = {
          ...baseEligibleBatch,
          id: `B_COLD_${status}`,
          cold_chain_status: status
        };
        const result = checkEligibility(batch, FIXED_REF_TIME);
        assert.equal(result.eligible, false);
        assert.equal(result.sellableQuantity, 0);
        assert.equal(result.status, EligibilityStatus.COLD_CHAIN_REVIEW);
        assert.equal(result.requiresReview, true);
      }
    });

    test('Missing cold-chain records for items requiring cold-chain are blocked for review', () => {
      const missingLogBatch = {
        ...baseEligibleBatch,
        id: 'B_COLD_MISSING',
        requiresColdChain: true,
        cold_chain_status: 'missing'
      };
      const result = checkEligibility(missingLogBatch, FIXED_REF_TIME);
      assert.equal(result.eligible, false);
      assert.equal(result.sellableQuantity, 0);
      assert.equal(result.status, EligibilityStatus.COLD_CHAIN_REVIEW);
      assert.ok(result.reason.includes('Missing cold-chain'));
    });

    test('Positive contribution cannot override cold-chain restriction', () => {
      const coldExceptionBatch = {
        ...baseEligibleBatch,
        id: 'B_COLD_OVERRIDE',
        cold_chain_status: 'exception'
      };
      const rec = generateRecommendation(coldExceptionBatch, { proposedPrice: 38, supportedDemand: 10 });
      assert.equal(rec.eligible, false);
      assert.equal(rec.allocatedQuantity, 0);
      assert.equal(rec.totalContribution, 0);
      assert.equal(rec.recommendedAction, ActionType.BLOCK_SALE_REVIEW);
    });
  });

  describe('4. Damaged Stock & Condition Handling', () => {
    test('Good conditions (good, intact, normal, fresh) are eligible for sale', () => {
      for (const cond of ['good', 'intact', 'normal', 'fresh']) {
        const batch = { ...baseEligibleBatch, condition: cond };
        const res = checkEligibility(batch, FIXED_REF_TIME);
        assert.equal(res.eligible, true);
        assert.equal(res.sellableQuantity, 10);
      }
    });

    test('Explicitly damaged stock (damaged, spoiled, crushed, broken) is hard-blocked', () => {
      for (const cond of ['damaged', 'compromised', 'spoiled', 'crushed', 'broken', 'leaking']) {
        const batch = { ...baseEligibleBatch, condition: cond };
        const res = checkEligibility(batch, FIXED_REF_TIME);
        assert.equal(res.eligible, false);
        assert.equal(res.sellableQuantity, 0);
        assert.equal(res.status, EligibilityStatus.DAMAGED);
      }
    });

    test('Unrecognized or suspicious condition status routes to review', () => {
      const suspiciousBatch = { ...baseEligibleBatch, condition: 'questionable_odor' };
      const res = checkEligibility(suspiciousBatch, FIXED_REF_TIME);
      assert.equal(res.eligible, false);
      assert.equal(res.sellableQuantity, 0);
      assert.equal(res.status, EligibilityStatus.COLD_CHAIN_REVIEW);
      assert.ok(res.reason.includes('Unrecognized stock condition'));
    });
  });

  describe('5. Demand Scenarios & Missing Demand Handling', () => {
    test('Missing demand evidence (null/undefined) holds allocation at 0 without fabricating sales', () => {
      const alloc = allocateStock(10, null);
      assert.equal(alloc.allocatedQuantity, 0);
      assert.equal(alloc.unsoldQuantity, 10);
      assert.equal(alloc.unmetDemand, null);
      assert.equal(alloc.demandStatus, DemandStatus.UNKNOWN);
      assert.ok(alloc.demandExplanation.includes('Demand evidence is missing'));
    });

    test('Confirmed zero demand scenario results in 0 sold units and ₹0 contribution', () => {
      const alloc = allocateStock(10, 0);
      assert.equal(alloc.allocatedQuantity, 0);
      assert.equal(alloc.unsoldQuantity, 10);
      assert.equal(alloc.unmetDemand, 0);
      assert.equal(alloc.demandStatus, DemandStatus.ZERO_DEMAND);

      const rec = generateRecommendation(baseEligibleBatch, { proposedPrice: 35, supportedDemand: 0 });
      assert.equal(rec.allocatedQuantity, 0);
      assert.equal(rec.totalContribution, 0);
      assert.equal(rec.recommendedAction, ActionType.NO_DEMAND_HOLD);
    });

    test('Supported demand greater than stock is capped and unmet demand is visible', () => {
      const alloc = allocateStock(8, 15);
      assert.equal(alloc.allocatedQuantity, 8); // Capped by available stock
      assert.equal(alloc.unsoldQuantity, 0);
      assert.equal(alloc.unmetDemand, 7); // 15 - 8
    });

    test('Supported demand lower than stock leaves unsold quantity visible', () => {
      const alloc = allocateStock(12, 5);
      assert.equal(alloc.allocatedQuantity, 5);
      assert.equal(alloc.unsoldQuantity, 7); // 12 - 5
      assert.equal(alloc.unmetDemand, 0);
    });

    test('Invalid or negative demand throws validation error', () => {
      assert.throws(() => allocateStock(10, -5), /Supported demand must be a non-negative integer/);
      assert.throws(() => allocateStock(10, 4.5), /Supported demand must be a non-negative integer/);
    });
  });

  describe('6. Financial Calculation Reliability & Case Checks Regression', () => {
    test('Case Check 1: 10 units @ ₹40 with ₹25 cost yields ₹150 contribution', () => {
      const unitContrib = calculateUnitContribution(40, 25);
      assert.equal(unitContrib, 15);
      const totalContrib = calculateTotalContribution(unitContrib, 10);
      assert.equal(totalContrib, 150);
    });

    test('Revenue and incremental costs are strictly separated without double counting', () => {
      const allocatedQty = 8;
      const price = 35;
      const cost = 20;

      const projectedRevenue = roundCurrency(allocatedQty * price); // 280
      const projectedCost = roundCurrency(allocatedQty * cost); // 160
      const unitContribution = calculateUnitContribution(price, cost); // 15
      const projectedContribution = calculateTotalContribution(unitContribution, allocatedQty); // 120

      assert.equal(projectedRevenue, 280);
      assert.equal(projectedCost, 160);
      assert.equal(projectedContribution, 120);
      assert.equal(projectedRevenue - projectedCost, projectedContribution);
    });

    test('Monetary arithmetic consistently rounds to 2 decimal places in INR', () => {
      assert.equal(roundCurrency(10.555), 10.56);
      assert.equal(roundCurrency(10.554), 10.55);
      assert.equal(roundCurrency(0.1 + 0.2), 0.3);
    });
  });

  describe('7. Persistence Resilience & Error Recovery', () => {
    test('Storage quota failures are safely caught without false success reports', () => {
      window.localStorage.setItem = () => {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      };

      const rec = generateRecommendation(baseEligibleBatch);
      const record = createDecisionRecord({ batch: baseEligibleBatch, recommendation: rec });

      assert.throws(
        () => saveDecision(record),
        /Storage write failed/
      );
    });

    test('Corrupted localStorage string is preserved without deletion while returning empty array', () => {
      window.localStorage.setItem(DECISIONS_STORAGE_KEY, '{"unclosed_corrupted_json:');

      const loaded = getStoredDecisions();
      assert.deepEqual(loaded, []);

      // Defensive recovery invariant: never silently erase corrupted user storage
      assert.equal(window.localStorage.getItem(DECISIONS_STORAGE_KEY), '{"unclosed_corrupted_json:');
    });

    test('Duplicate submission clicks do not create duplicate records', () => {
      const rec = generateRecommendation(baseEligibleBatch);
      const record = createDecisionRecord({ batch: baseEligibleBatch, recommendation: rec });

      saveDecision(record);
      saveDecision(record); // Repeated click attempt

      const all = getStoredDecisions();
      assert.equal(all.length, 1);
    });
  });
});
