import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateRecommendation, ActionType } from '../domain/recommendations.js';
import {
  calculateUnitContribution,
  calculateTotalContribution,
  calculateDiscountPercent,
  checkAllowedMarkdownLimit,
  checkMinimumContribution,
  roundCurrency
} from '../domain/economics.js';
import { allocateStock, DemandStatus } from '../domain/allocation.js';
import { checkEligibility, EligibilityStatus } from '../domain/eligibility.js';
import { validateSimulationParams } from '../domain/validation.js';

describe('Module 3: Markdown Simulator Engine Tests', () => {
  // Test fixture item
  const validBatch = {
    id: 'B1',
    productName: 'Fresh Dairy Milk (1L)',
    qty: 10,
    originalPrice: 40,
    incrementalCost: 25,
    allowedMarkdownPercent: 40,
    expired: false,
    condition: 'good',
    coldChainStatus: 'ok'
  };

  const expiredBatch = {
    id: 'B2',
    productName: 'Artisan Sourdough Loaf',
    qty: 20,
    originalPrice: 50,
    incrementalCost: 20,
    allowedMarkdownPercent: 40,
    expired: true,
    condition: 'good',
    coldChainStatus: 'none'
  };

  const damagedBatch = {
    id: 'B3',
    productName: 'Greek Yogurt Tub',
    qty: 15,
    originalPrice: 60,
    incrementalCost: 30,
    allowedMarkdownPercent: 30,
    expired: false,
    condition: 'damaged',
    coldChainStatus: 'ok'
  };

  const coldChainExceptionBatch = {
    id: 'B4',
    productName: 'Organic Whole Milk',
    qty: 12,
    originalPrice: 45,
    incrementalCost: 25,
    allowedMarkdownPercent: 40,
    expired: false,
    condition: 'good',
    coldChainStatus: 'exception'
  };

  describe('1. Pricing & Input Validation Tests', () => {
    test('accepts valid markdown within permitted range', () => {
      const rec = generateRecommendation(validBatch, { proposedPrice: 35, supportedDemand: 10 });
      assert.equal(rec.recommendedAction, ActionType.RECOMMEND_MARKDOWN_SALE);
      assert.equal(rec.unitContribution, 10); // 35 - 25
      assert.equal(rec.discountPercent, 12.5); // (40 - 35) / 40
    });

    test('accepts zero markdown (selling at full original price)', () => {
      const rec = generateRecommendation(validBatch, { proposedPrice: 40, supportedDemand: 10 });
      assert.equal(rec.recommendedAction, ActionType.RECOMMEND_MARKDOWN_SALE);
      assert.equal(rec.unitContribution, 15); // 40 - 25
      assert.equal(rec.discountPercent, 0);
    });

    test('accepts maximum permitted markdown price boundary', () => {
      // 40% of 40 is 16, min price is 24
      const rec = generateRecommendation(validBatch, { proposedPrice: 24, supportedDemand: 10 });
      assert.equal(rec.eligible, true);
      assert.equal(rec.discountPercent, 40);
    });

    test('rejects proposed price exceeding maximum allowed markdown', () => {
      // 40% cap means min price is 24; 20 is beyond 40% markdown
      const rec = generateRecommendation(validBatch, { proposedPrice: 20, supportedDemand: 10 });
      assert.equal(rec.recommendedAction, ActionType.PRICE_RULE_REJECTED);
      assert.equal(rec.approvedContribution, 0);
      assert.ok(rec.explanation.includes('maximum allowed markdown'));
    });

    test('rejects proposed price exceeding original selling price', () => {
      const rec = generateRecommendation(validBatch, { proposedPrice: 45, supportedDemand: 10 });
      assert.equal(rec.recommendedAction, ActionType.PRICE_RULE_REJECTED);
      assert.ok(rec.explanation.includes('cannot exceed original price'));
    });

    test('rejects negative proposed prices', () => {
      const rec = generateRecommendation(validBatch, { proposedPrice: -10, supportedDemand: 10 });
      assert.equal(rec.recommendedAction, ActionType.PRICE_RULE_REJECTED);
      assert.ok(rec.explanation.includes('must be a non-negative number'));
    });

    test('enforces 2-decimal INR currency rounding', () => {
      assert.equal(roundCurrency(15.456), 15.46);
      assert.equal(roundCurrency(10.004), 10.00);
      assert.equal(calculateUnitContribution(39.99, 24.50), 15.49);
    });
  });

  describe('2. Demand & Allocation Tests', () => {
    test('caps allocation when supported demand is lower than available stock (8 demand < 10 stock)', () => {
      const alloc = allocateStock(10, 8);
      assert.equal(alloc.allocatedQuantity, 8);
      assert.equal(alloc.unsoldQuantity, 2);
      assert.equal(alloc.unmetDemand, 0);
      assert.equal(alloc.demandStatus, DemandStatus.EVIDENCED);
    });

    test('caps allocation when supported demand is greater than available stock (15 demand > 10 stock)', () => {
      const alloc = allocateStock(10, 15);
      assert.equal(alloc.allocatedQuantity, 10);
      assert.equal(alloc.unsoldQuantity, 0);
      assert.equal(alloc.unmetDemand, 5);
      assert.equal(alloc.demandStatus, DemandStatus.EVIDENCED);
    });

    test('handles confirmed zero demand properly (0 units allocated, all stock unsold)', () => {
      const alloc = allocateStock(10, 0);
      assert.equal(alloc.allocatedQuantity, 0);
      assert.equal(alloc.unsoldQuantity, 10);
      assert.equal(alloc.unmetDemand, 0);
      assert.equal(alloc.demandStatus, DemandStatus.ZERO_DEMAND);
    });

    test('handles missing or unevidenced demand safely without fabricating sales', () => {
      const alloc = allocateStock(10, null);
      assert.equal(alloc.allocatedQuantity, 0);
      assert.equal(alloc.unsoldQuantity, 10);
      assert.equal(alloc.unmetDemand, null);
      assert.equal(alloc.demandStatus, DemandStatus.UNKNOWN);
    });

    test('guarantees allocated quantity never exceeds available eligible stock', () => {
      const alloc1 = allocateStock(5, 500);
      assert.equal(alloc1.allocatedQuantity, 5);
      const alloc2 = allocateStock(0, 10);
      assert.equal(alloc2.allocatedQuantity, 0);
    });
  });

  describe('3. Contribution, Minimum Policy, and Food Safety Tests', () => {
    test('calculates correct unit and total contribution for allocated units', () => {
      // 10 units @ 40 with cost 25
      const unit = calculateUnitContribution(40, 25);
      const total = calculateTotalContribution(unit, 10);
      assert.equal(unit, 15);
      assert.equal(total, 150);
    });

    test('satisfies minimum contribution policy when unit contribution is above floor', () => {
      const policyCheck = checkMinimumContribution(15, { minUnitContribution: 5 });
      assert.equal(policyCheck.compliant, true);
    });

    test('flags violation when unit contribution is below store policy floor', () => {
      const policyCheck = checkMinimumContribution(3, { minUnitContribution: 5 });
      assert.equal(policyCheck.compliant, false);
      assert.ok(policyCheck.reason.includes('below required minimum threshold'));
    });

    test('hard-blocks expired batch B2 from sale even with attractive margin (+₹30)', () => {
      const rec = generateRecommendation(expiredBatch, { proposedPrice: 50, supportedDemand: 10 });
      assert.equal(rec.eligible, false);
      assert.equal(rec.allocatedQuantity, 0);
      assert.equal(rec.approvedContribution, 0);
      assert.equal(rec.recommendedAction, ActionType.BLOCK_SALE_DISPOSAL);
      assert.ok(rec.explanation.includes('SALE BLOCKED'));
      assert.ok(rec.explanation.includes('Attractive margins cannot bypass food safety'));
    });

    test('hard-blocks damaged stock B3 from recovery sale', () => {
      const rec = generateRecommendation(damagedBatch, { proposedPrice: 50, supportedDemand: 10 });
      assert.equal(rec.eligible, false);
      assert.equal(rec.allocatedQuantity, 0);
      assert.equal(rec.recommendedAction, ActionType.BLOCK_SALE_DISPOSAL);
      assert.ok(rec.eligibilityReason.includes('damaged'));
    });

    test('flags cold-chain exception B4 for manager review and blocks sale', () => {
      const rec = generateRecommendation(coldChainExceptionBatch, { proposedPrice: 40, supportedDemand: 10 });
      assert.equal(rec.eligible, false);
      assert.equal(rec.allocatedQuantity, 0);
      assert.equal(rec.recommendedAction, ActionType.BLOCK_SALE_REVIEW);
      assert.ok(rec.eligibilityReason.toLowerCase().includes('cold-chain'));
    });
  });

  describe('4. Immutability & Non-Mutation Tests', () => {
    test('guarantees input batch object is never mutated during simulation', () => {
      const copy = JSON.parse(JSON.stringify(validBatch));
      generateRecommendation(validBatch, { proposedPrice: 30, supportedDemand: 8 });
      assert.deepEqual(validBatch, copy);
    });
  });
});
