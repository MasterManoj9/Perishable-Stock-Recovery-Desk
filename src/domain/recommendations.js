/**
 * recommendations.js - Deterministic Recommendation Engine
 *
 * Integrates:
 * - Validation (input sanity)
 * - Eligibility (food safety gate)
 * - Economics (markdown constraints & contribution)
 * - Allocation (demand-capped stock balance)
 *
 * Generates structured, transparent, auditable decision recommendations.
 * Never allows safety blocks to be bypassed by positive margins.
 * Labels outcomes as simulated estimates, never realized revenue.
 */

import { validateBatch, validateSimulationParams } from './validation.js';
import { checkEligibility, EligibilityStatus } from './eligibility.js';
import {
  calculateUnitContribution,
  calculateTotalContribution,
  calculateDiscountPercent,
  checkAllowedMarkdownLimit,
  checkMinimumContribution,
  roundCurrency
} from './economics.js';
import { allocateStock, DemandStatus } from './allocation.js';

export const ActionType = {
  RECOMMEND_MARKDOWN_SALE: 'RECOMMEND_MARKDOWN_SALE',
  BLOCK_SALE_DISPOSAL: 'BLOCK_SALE_DISPOSAL',
  BLOCK_SALE_REVIEW: 'BLOCK_SALE_REVIEW',
  PRICE_RULE_REJECTED: 'PRICE_RULE_REJECTED',
  NO_DEMAND_HOLD: 'NO_DEMAND_HOLD',
  INVALID_INPUT: 'INVALID_INPUT'
};

/**
 * Generates a full stock-recovery recommendation for a batch given proposed simulation parameters.
 * 
 * @param {Object} batch - The raw batch record
 * @param {Object} [simulationParams={}] - Optional simulation overrides (proposedPrice, supportedDemand)
 * @param {Object} [options={}] - Options (referenceTime, minContributionPolicy)
 * @returns {Object} Structured recommendation object
 */
export function generateRecommendation(batch, simulationParams = {}, options = {}) {
  const referenceTime = options.referenceTime || Date.now();
  const minContributionPolicy = options.minContributionPolicy || {};

  // 1. Initial batch validation
  const batchValidation = validateBatch(batch);
  if (!batchValidation.valid) {
    return {
      status: ActionType.INVALID_INPUT,
      recommendedAction: ActionType.INVALID_INPUT,
      eligible: false,
      allocatedQuantity: 0,
      unsoldQuantity: batch && typeof batch.qty === 'number' ? batch.qty : 0,
      unmetDemand: null,
      unitContribution: 0,
      totalContribution: 0,
      approvedContribution: 0,
      isSimulated: true,
      requiresConfirmation: false,
      validationErrors: batchValidation.errors,
      explanation: `Batch input failed validation: ${batchValidation.errors.map(e => e.message).join('; ')}`
    };
  }

  // 2. Food-Safety & Stock Eligibility Gate (ALWAYS evaluated first)
  const eligibility = checkEligibility(batch, referenceTime);

  // Extract base economic fields
  const originalPrice = batch.sale_price_inr !== undefined ? batch.sale_price_inr : batch.originalPrice;
  const incrementalCost = batch.incremental_cost_inr !== undefined ? batch.incremental_cost_inr : batch.incrementalCost;
  const maxMarkdown = batch.allowed_markdown_percent !== undefined ? batch.allowed_markdown_percent : batch.allowedMarkdownPercent;

  // Determine proposed price (default to original price if not in simulation params)
  const proposedPrice = simulationParams.proposedPrice !== undefined && simulationParams.proposedPrice !== null
    ? simulationParams.proposedPrice
    : originalPrice;

  // Determine supported demand (default to batch demand or scenario if provided)
  const supportedDemand = simulationParams.supportedDemand !== undefined && simulationParams.supportedDemand !== null
    ? simulationParams.supportedDemand
    : (batch.demand_assumption_units !== undefined ? batch.demand_assumption_units : null);

  // 3. If Stock is NOT Eligible: Hard-block sale. No margin can bypass this.
  if (!eligibility.eligible) {
    const isColdChainReview = eligibility.status === EligibilityStatus.COLD_CHAIN_REVIEW;
    const action = isColdChainReview ? ActionType.BLOCK_SALE_REVIEW : ActionType.BLOCK_SALE_DISPOSAL;

    return {
      status: action,
      recommendedAction: action,
      batchId: batch.id,
      eligible: false,
      eligibilityStatus: eligibility.status,
      eligibilityReason: eligibility.reason,
      originalPrice,
      proposedPrice,
      discountPercent: 0,
      incrementalCost,
      // Potential unit margin computed for transparent audit, but NEVER approved
      potentialUnitMargin: roundCurrency(proposedPrice - incrementalCost),
      unitContribution: 0,
      totalContribution: 0,
      approvedContribution: 0,
      allocatedQuantity: 0,
      unsoldQuantity: batch.qty,
      unmetDemand: supportedDemand !== null ? supportedDemand : null,
      demandStatus: supportedDemand !== null ? DemandStatus.EVIDENCED : DemandStatus.UNKNOWN,
      isSimulated: true,
      requiresConfirmation: true,
      validationErrors: [],
      explanation: `SALE BLOCKED: ${eligibility.reason} Sellable quantity is strictly 0. Attractive margins cannot bypass food safety.`
    };
  }

  // 4. Validate Simulation Parameters
  const paramValidation = validateSimulationParams(
    { proposedPrice, supportedDemand },
    originalPrice,
    incrementalCost,
    maxMarkdown
  );

  if (!paramValidation.valid) {
    return {
      status: ActionType.PRICE_RULE_REJECTED,
      recommendedAction: ActionType.PRICE_RULE_REJECTED,
      batchId: batch.id,
      eligible: true,
      eligibilityStatus: eligibility.status,
      originalPrice,
      proposedPrice,
      discountPercent: calculateDiscountPercent(originalPrice, proposedPrice),
      incrementalCost,
      unitContribution: 0,
      totalContribution: 0,
      approvedContribution: 0,
      allocatedQuantity: 0,
      unsoldQuantity: batch.qty,
      unmetDemand: supportedDemand,
      isSimulated: true,
      requiresConfirmation: false,
      validationErrors: paramValidation.errors,
      explanation: `Simulation parameters rejected: ${paramValidation.errors.map(e => e.message).join('; ')}`
    };
  }

  // 5. Evaluate Economics
  const unitContribution = calculateUnitContribution(proposedPrice, incrementalCost);
  const discountPercent = calculateDiscountPercent(originalPrice, proposedPrice);
  const markdownCheck = checkAllowedMarkdownLimit(originalPrice, proposedPrice, maxMarkdown);
  const minContribCheck = checkMinimumContribution(unitContribution, minContributionPolicy);

  if (!markdownCheck.compliant) {
    return {
      status: ActionType.PRICE_RULE_REJECTED,
      recommendedAction: ActionType.PRICE_RULE_REJECTED,
      batchId: batch.id,
      eligible: true,
      eligibilityStatus: eligibility.status,
      originalPrice,
      proposedPrice,
      discountPercent,
      incrementalCost,
      unitContribution,
      totalContribution: 0,
      approvedContribution: 0,
      allocatedQuantity: 0,
      unsoldQuantity: batch.qty,
      unmetDemand: supportedDemand,
      isSimulated: true,
      requiresConfirmation: false,
      validationErrors: [{ field: 'proposedPrice', code: 'MARKDOWN_LIMIT_EXCEEDED', message: markdownCheck.reason }],
      explanation: `PRICE RULE VIOLATION: ${markdownCheck.reason}`
    };
  }

  if (!minContribCheck.compliant) {
    return {
      status: ActionType.PRICE_RULE_REJECTED,
      recommendedAction: ActionType.PRICE_RULE_REJECTED,
      batchId: batch.id,
      eligible: true,
      eligibilityStatus: eligibility.status,
      originalPrice,
      proposedPrice,
      discountPercent,
      incrementalCost,
      unitContribution,
      totalContribution: 0,
      approvedContribution: 0,
      allocatedQuantity: 0,
      unsoldQuantity: batch.qty,
      unmetDemand: supportedDemand,
      isSimulated: true,
      requiresConfirmation: false,
      validationErrors: [{ field: 'unitContribution', code: 'MIN_CONTRIBUTION_FAILED', message: minContribCheck.reason }],
      explanation: `FINANCIAL RULE VIOLATION: ${minContribCheck.reason}`
    };
  }

  // 6. Allocate Quantity Capped by Stock and Supported Demand
  const allocation = allocateStock(eligibility.sellableQuantity, supportedDemand);

  // 7. Calculate Contribution on Allocated Units
  const totalContribution = calculateTotalContribution(unitContribution, allocation.allocatedQuantity);

  const action = allocation.allocatedQuantity > 0
    ? ActionType.RECOMMEND_MARKDOWN_SALE
    : ActionType.NO_DEMAND_HOLD;

  return {
    status: action,
    recommendedAction: action,
    batchId: batch.id,
    eligible: true,
    eligibilityStatus: eligibility.status,
    originalPrice,
    proposedPrice,
    discountPercent,
    incrementalCost,
    unitContribution,
    totalContribution,
    approvedContribution: totalContribution,
    allocatedQuantity: allocation.allocatedQuantity,
    unsoldQuantity: allocation.unsoldQuantity,
    unmetDemand: allocation.unmetDemand,
    demandStatus: allocation.demandStatus,
    demandExplanation: allocation.demandExplanation,
    isSimulated: true,
    requiresConfirmation: true,
    validationErrors: [],
    explanation: allocation.allocatedQuantity > 0
      ? `APPROVED SIMULATION: Allocate ${allocation.allocatedQuantity} units at ₹${proposedPrice} (Unit contribution: ₹${unitContribution}). Expected simulated recovery: ₹${totalContribution}. ${allocation.unsoldQuantity} units remain unsold.`
      : `HELD: ${allocation.demandExplanation}`
  };
}
