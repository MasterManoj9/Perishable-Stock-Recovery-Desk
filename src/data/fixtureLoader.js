/**
 * fixtureLoader.js - Authoritative Fixture Loading & Normalization Layer
 *
 * Enforces contract:
 * - Loads official fixture from /Starter_Data/C30/fixture.json
 * - Maps raw fields without mutating authoritative sources
 * - Uses shared domain engine for validation & eligibility
 * - Supports extended store catalog (24 batches matching the UI mockup)
 */

import { validateBatch } from '../domain/validation.js';
import { checkEligibility } from '../domain/eligibility.js';
import { STORE_CATALOG_24 } from './storeCatalog.js';

export const FIXTURE_PATH = '/Starter_Data/C30/fixture.json';

/**
 * Friendly display name helper for teaching fixture batches.
 * @param {string} id
 * @returns {string}
 */
export function getProductDisplayName(id) {
  const catalog = {
    B1: 'Fresh Dairy Milk (1L Pouch)',
    B2: 'Artisan Sourdough Loaf (400g)'
  };
  return catalog[id] || `Perishable Inventory (${id})`;
}

/**
 * Friendly product emoji/thumbnail icon helper.
 * @param {string} id
 * @param {string} [name='']
 * @returns {string}
 */
export function getProductImage(id, name = '') {
  const lower = (name || '').toLowerCase();
  if (lower.includes('banana')) return '🍌';
  if (lower.includes('sandwich')) return '🥪';
  if (lower.includes('milk')) return '🥛';
  if (lower.includes('egg')) return '🥚';
  if (lower.includes('yogurt') || lower.includes('strawberry')) return '🍓';
  if (lower.includes('cheese') || lower.includes('paneer') || lower.includes('feta')) return '🧀';
  if (lower.includes('chicken') || lower.includes('meat') || lower.includes('ham')) return '🍗';
  if (lower.includes('bread') || lower.includes('sourdough') || lower.includes('bagel') || lower.includes('croissant') || lower.includes('muffin')) return '🥖';
  if (lower.includes('mango') || lower.includes('avocado') || lower.includes('produce')) return '🥑';
  if (lower.includes('coffee') || lower.includes('brew') || lower.includes('drink')) return '☕';
  if (lower.includes('fish') || lower.includes('salmon')) return '🐟';
  if (id === 'B1') return '🥛';
  if (id === 'B2') return '🥖';
  return '📦';
}

/**
 * Normalizes an array of raw batch records from the fixture or catalog.
 * 
 * @param {Array<Object>} rawBatches 
 * @param {Object} [metadata={}]
 * @param {string|number|Date} [referenceTime]
 * @returns {{ validBatches: Array<Object>, invalidRecords: Array<Object> }}
 */
export function normalizeBatches(rawBatches, metadata = {}, referenceTime = Date.now()) {
  if (!Array.isArray(rawBatches)) {
    return { validBatches: [], invalidRecords: [] };
  }

  const defaultDemand = metadata.demand_assumption_units !== undefined ? metadata.demand_assumption_units : null;
  const validBatches = [];
  const invalidRecords = [];

  for (const raw of rawBatches) {
    const validation = validateBatch(raw);
    if (!validation.valid) {
      invalidRecords.push({
        raw,
        errors: validation.errors
      });
      continue;
    }

    const eligibility = checkEligibility(raw, referenceTime);

    const originalPrice = raw.sale_price_inr !== undefined ? raw.sale_price_inr : raw.originalPrice;
    const incrementalCost = raw.incremental_cost_inr !== undefined ? raw.incremental_cost_inr : raw.incrementalCost;
    const maxMarkdown = raw.allowed_markdown_percent !== undefined ? raw.allowed_markdown_percent : (raw.allowedMarkdownPercent ?? 40);

    const productName = raw.productName || getProductDisplayName(raw.id);
    const image = raw.image || getProductImage(raw.id, productName);

    const normalized = {
      id: raw.id,
      productName,
      category: raw.category || 'General',
      image,
      qty: raw.qty,
      originalPrice,
      incrementalCost,
      unitMargin: Math.round((originalPrice - incrementalCost) * 100) / 100,
      expired: raw.expired === true,
      expiryAt: raw.expiryAt || null,
      expiryDisplay: raw.expiryDisplay || (raw.expired ? 'Expired' : 'Active'),
      expiryNote: raw.expiryNote || (raw.expired ? 'Expired' : 'Cleared for sale'),
      expiringSoon: raw.expiringSoon === true,
      condition: raw.condition || 'good',
      coldChainStatus: raw.cold_chain_status || raw.coldChainStatus || 'not_required',
      allowedMarkdownPercent: maxMarkdown,
      demandEvidence: raw.demandEvidence || (raw.demand_assumption_units ? 'Available (Base)' : 'Available (High)'),
      demandAssumptionUnits: raw.demand_assumption_units !== undefined ? raw.demand_assumption_units : (raw.demandAssumptionUnits || defaultDemand),
      eligibility,
      raw
    };

    validBatches.push(normalized);
  }

  return { validBatches, invalidRecords };
}

/**
 * Loads and validates the official fixture from public path.
 */
export async function loadOfficialFixture(url = FIXTURE_PATH, referenceTime = Date.now()) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load fixture: HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
      throw new Error('Malformed fixture: root must be a valid JSON object');
    }

    if (!data.records || !Array.isArray(data.records.batches)) {
      throw new Error('Malformed fixture: missing records.batches array');
    }

    const { validBatches, invalidRecords } = normalizeBatches(
      data.records.batches,
      data.records,
      referenceTime
    );

    return {
      success: true,
      metadata: {
        caseId: data.case_id || 'C30',
        synthetic: data.synthetic === true,
        dataVersion: data.data_version || 'v1.0',
        currency: data.currency || 'INR',
        limit: data.limit || '',
        publicChecks: data.public_checks || [],
        demandAssumptionUnits: data.records.demand_assumption_units
      },
      batches: validBatches,
      invalidRecords
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Unknown error while loading official fixture',
      metadata: {},
      batches: [],
      invalidRecords: []
    };
  }
}

/**
 * Loads the full 24-batch store catalog matching the mockup image.
 */
export function loadStoreCatalogBatches(referenceTime = Date.now()) {
  const { validBatches, invalidRecords } = normalizeBatches(STORE_CATALOG_24, { demand_assumption_units: 10 }, referenceTime);
  return {
    success: true,
    metadata: {
      caseId: 'C30',
      synthetic: true,
      dataVersion: 'v3.2',
      currency: 'INR',
      limit: 'Full store demonstration inventory catalog (24 batches).'
    },
    batches: validBatches,
    invalidRecords
  };
}
