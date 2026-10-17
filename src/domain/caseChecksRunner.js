/**
 * caseChecksRunner.js - Official 3 Mandatory Case Checks Runner
 *
 * Runs the three required judging checks in EXACT printed order:
 * 1. Check 1 (10 pts): Contribution case (10 units @ ₹40, incremental cost ₹25 -> ₹15/unit, ₹150 total).
 * 2. Check 2 (10 pts): Expired stock blocked (B2 is expired -> 0 sellable units, blocked, reason provided).
 * 3. Check 3 (5 pts): Demand cap (available 8 vs demand 12 -> 8; available 12 vs demand 8 -> 8 allocated, 4 unsold).
 *
 * Single source of truth for automated Vitest/Node tests and future UI Case Checks panel.
 */

import { calculateUnitContribution, calculateTotalContribution } from './economics.js';
import { checkEligibility, EligibilityStatus } from './eligibility.js';
import { allocateStock } from './allocation.js';
import { generateRecommendation, ActionType } from './recommendations.js';

/**
 * Runs the 3 mandatory case checks in exact printed order.
 * @param {Object} [fixtureData] - Optional authoritative fixture
 * @returns {Array<{ id: string, order: number, title: string, expected: Object, actual: Object, passed: boolean, explanation: string }>}
 */
export function runMandatoryCaseChecks(fixtureData = null) {
  const results = [];

  // ==========================================
  // CASE CHECK 1 — CONTRIBUTION (10 Points)
  // Input: 10 units sold at ₹40 each; incremental cost is ₹25 per unit.
  // Expected:
  // - Contribution per unit = ₹40 - ₹25 = ₹15
  // - Total contribution = 10 * ₹15 = ₹150
  // ==========================================
  const check1Input = { qtySold: 10, sellingPrice: 40, incrementalCost: 25 };
  const actualUnitContrib1 = calculateUnitContribution(check1Input.sellingPrice, check1Input.incrementalCost);
  const actualTotalContrib1 = calculateTotalContribution(actualUnitContrib1, check1Input.qtySold);

  const check1Passed = actualUnitContrib1 === 15 && actualTotalContrib1 === 150;

  results.push({
    id: 'CASE_CHECK_1',
    order: 1,
    points: 10,
    title: 'Contribution Calculation (₹150 Expected)',
    description: '10 units sold at ₹40 with incremental cost of ₹25 each must yield ₹15/unit and ₹150 total.',
    input: check1Input,
    expected: {
      unitContribution: 15,
      totalContribution: 150
    },
    actual: {
      unitContribution: actualUnitContrib1,
      totalContribution: actualTotalContrib1
    },
    passed: check1Passed,
    explanation: check1Passed
      ? 'PASS: 10 units × (₹40 − ₹25) = 10 × ₹15 = ₹150 exactly.'
      : `FAIL: Expected ₹15/unit & ₹150 total, got ₹${actualUnitContrib1}/unit & ₹${actualTotalContrib1} total.`
  });

  // ==========================================
  // CASE CHECK 2 — EXPIRED STOCK BLOCKED (10 Points)
  // Input: Expired batch B2 (Price ₹50, Cost ₹20 -> Margin ₹30 attractive, but expired: true)
  // Expected: Action blocked, sellable quantity 0, clear reason, no approved sale contribution.
  // ==========================================
  const check2Batch = fixtureData?.records?.batches?.find(b => b.id === 'B2') || {
    id: 'B2',
    qty: 20,
    sale_price_inr: 50,
    incremental_cost_inr: 20,
    expired: true
  };

  const check2Eligibility = checkEligibility(check2Batch);
  const check2Rec = generateRecommendation(check2Batch, { proposedPrice: 50, supportedDemand: 10 });

  const check2Passed = (
    check2Eligibility.eligible === false &&
    check2Eligibility.sellableQuantity === 0 &&
    check2Rec.eligible === false &&
    check2Rec.allocatedQuantity === 0 &&
    check2Rec.approvedContribution === 0 &&
    check2Rec.recommendedAction === ActionType.BLOCK_SALE_DISPOSAL &&
    typeof check2Rec.eligibilityReason === 'string' &&
    check2Rec.eligibilityReason.length > 0
  );

  results.push({
    id: 'CASE_CHECK_2',
    order: 2,
    points: 10,
    title: 'Expired Batch Blocked from Sale',
    description: 'An expired batch must not be sellable even if proposed price yields an attractive margin (+₹30).',
    input: {
      batchId: check2Batch.id,
      qty: check2Batch.qty,
      salePrice: check2Batch.sale_price_inr,
      cost: check2Batch.incremental_cost_inr,
      apparentMargin: check2Batch.sale_price_inr - check2Batch.incremental_cost_inr,
      expired: check2Batch.expired
    },
    expected: {
      eligible: false,
      sellableQuantity: 0,
      allocatedQuantity: 0,
      approvedContribution: 0,
      recommendedAction: ActionType.BLOCK_SALE_DISPOSAL,
      reasonRequired: true
    },
    actual: {
      eligible: check2Rec.eligible,
      sellableQuantity: check2Eligibility.sellableQuantity,
      allocatedQuantity: check2Rec.allocatedQuantity,
      approvedContribution: check2Rec.approvedContribution,
      recommendedAction: check2Rec.recommendedAction,
      reason: check2Rec.eligibilityReason
    },
    passed: check2Passed,
    explanation: check2Passed
      ? `PASS: Expired batch ${check2Batch.id} strictly blocked. Sellable qty: 0, allocated: 0, contribution: ₹0. Reason: "${check2Rec.eligibilityReason}"`
      : 'FAIL: Expired batch was not properly blocked or allowed non-zero allocation/contribution.'
  });

  // ==========================================
  // CASE CHECK 3 — DEMAND CAP & VISIBLE UNSOLD (5 Points)
  // Part A: Available 8, Demand 12 -> Allocated 8, Unmet 4
  // Part B: Available 12, Demand 8 -> Allocated 8, Unsold 4
  // ==========================================
  const partA = allocateStock(8, 12);
  const partB = allocateStock(12, 8);

  const partAPassed = partA.allocatedQuantity === 8 && partA.unsoldQuantity === 0 && partA.unmetDemand === 4;
  const partBPassed = partB.allocatedQuantity === 8 && partB.unsoldQuantity === 4 && partB.unmetDemand === 0;
  const check3Passed = partAPassed && partBPassed;

  results.push({
    id: 'CASE_CHECK_3',
    order: 3,
    points: 5,
    title: 'Demand Capped & Unsold Stock Visible',
    description: 'Demand above available stock is capped; demand below available stock leaves unsold units visible.',
    input: {
      scenarioA: { availableStock: 8, supportedDemand: 12 },
      scenarioB: { availableStock: 12, supportedDemand: 8 }
    },
    expected: {
      scenarioA: { allocated: 8, unsold: 0, unmetDemand: 4 },
      scenarioB: { allocated: 8, unsold: 4, unmetDemand: 0 }
    },
    actual: {
      scenarioA: { allocated: partA.allocatedQuantity, unsold: partA.unsoldQuantity, unmetDemand: partA.unmetDemand },
      scenarioB: { allocated: partB.allocatedQuantity, unsold: partB.unsoldQuantity, unmetDemand: partB.unmetDemand }
    },
    passed: check3Passed,
    explanation: check3Passed
      ? 'PASS: 8 vs 12 capped at 8 (4 unmet). 12 vs 8 allocated 8 (4 unsold units visible).'
      : 'FAIL: Allocation cap or unsold stock visibility mismatch.'
  });

  return results;
}
