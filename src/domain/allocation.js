/**
 * allocation.js - Demand-Capped Stock Allocation Engine
 *
 * Implements:
 * - allocatedQuantity = min(availableEligibleQuantity, supportedDemand)
 * - unsoldQuantity = availableEligibleQuantity - allocatedQuantity
 * - unmetDemand = max(0, supportedDemand - allocatedQuantity)
 * - Strict non-negative integer bounds
 * - Explicit distinction between zero demand and missing/unknown demand
 * - Preserves original records (zero mutation)
 */

import { isNonNegativeInteger } from './validation.js';

export const DemandStatus = {
  EVIDENCED: 'EVIDENCED',
  UNKNOWN: 'UNKNOWN_OR_MISSING',
  ZERO_DEMAND: 'ZERO_DEMAND'
};

/**
 * Allocates available eligible stock against supported demand.
 * 
 * @param {number} availableEligibleQuantity - Eligible units on hand (0 if blocked)
 * @param {number|null|undefined} supportedDemand - Supported demand from scenario or evidence
 * @returns {{
 *   allocatedQuantity: number,
 *   unsoldQuantity: number,
 *   unmetDemand: number|null,
 *   demandStatus: string,
 *   demandExplanation: string
 * }}
 */
export function allocateStock(availableEligibleQuantity, supportedDemand) {
  // Defensive validation of available stock
  if (!isNonNegativeInteger(availableEligibleQuantity)) {
    throw new Error('Available eligible quantity must be a non-negative integer');
  }

  // Handle missing or unknown demand evidence
  if (supportedDemand === null || supportedDemand === undefined) {
    return {
      allocatedQuantity: 0,
      unsoldQuantity: availableEligibleQuantity,
      unmetDemand: null,
      demandStatus: DemandStatus.UNKNOWN,
      demandExplanation: 'Demand evidence is missing or unevidenced. Allocation held at 0 to prevent speculative waste.'
    };
  }

  if (!isNonNegativeInteger(supportedDemand)) {
    throw new Error('Supported demand must be a non-negative integer');
  }

  // Confirmed zero demand scenario
  if (supportedDemand === 0) {
    return {
      allocatedQuantity: 0,
      unsoldQuantity: availableEligibleQuantity,
      unmetDemand: 0,
      demandStatus: DemandStatus.ZERO_DEMAND,
      demandExplanation: 'Supported demand is confirmed zero. 0 units allocated; all stock remains unsold.'
    };
  }

  // Demand-capped allocation formula: min(availableEligibleQuantity, supportedDemand)
  const allocated = Math.min(availableEligibleQuantity, supportedDemand);
  const unsold = availableEligibleQuantity - allocated;
  const unmet = Math.max(0, supportedDemand - allocated);

  return {
    allocatedQuantity: allocated,
    unsoldQuantity: unsold,
    unmetDemand: unmet,
    demandStatus: DemandStatus.EVIDENCED,
    demandExplanation: `Allocated ${allocated} units (Capped by ${allocated === availableEligibleQuantity ? 'available stock' : 'supported demand'}). ${unsold} units unsold; ${unmet} unmet demand.`
  };
}
