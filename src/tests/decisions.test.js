import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDecisionRecord,
  getStoredDecisions,
  getStoredDecisionById,
  saveDecision,
  clearStoredDecisions,
  DECISIONS_STORAGE_KEY
} from '../data/decisionStore.js';
import {
  validateDecisionRecord,
  CURRENT_SCHEMA_VERSION
} from '../domain/validation.js';
import { generateRecommendation, ActionType } from '../domain/recommendations.js';

describe('Module 4: Decision Records, Persistence, and Audit History Tests', () => {
  // Mock window.localStorage for Node environment
  let storageMap = {};

  beforeEach(() => {
    storageMap = {};
    globalThis.window = {
      localStorage: {
        getItem: (key) => storageMap[key] ?? null,
        setItem: (key, val) => { storageMap[key] = String(val); },
        removeItem: (key) => { delete storageMap[key]; },
        clear: () => { storageMap = {}; }
      }
    };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  const validBatchB1 = {
    id: 'B1',
    productName: 'Fresh Whole Milk 1L',
    category: 'Dairy',
    qty: 10,
    originalPrice: 40,
    sale_price_inr: 40,
    incrementalCost: 25,
    incremental_cost_inr: 25,
    expired: false,
    expiryAt: '2026-10-25T12:00:00Z',
    allowedMarkdownPercent: 50
  };

  const expiredBatchB2 = {
    id: 'B2',
    productName: 'Gourmet Sourdough Loaf',
    category: 'Bakery',
    qty: 20,
    originalPrice: 50,
    sale_price_inr: 50,
    incrementalCost: 20,
    incremental_cost_inr: 20,
    expired: true,
    expiryAt: '2026-10-15T08:00:00Z'
  };

  describe('1. Record Creation & Schema Integrity', () => {
    test('creates a complete decision record conforming to schema version 1.0.0', () => {
      const recommendation = generateRecommendation(validBatchB1, {
        proposedPrice: 35,
        supportedDemand: 8
      });

      const record = createDecisionRecord({
        batch: validBatchB1,
        scenario: {
          proposedPrice: 35,
          markdownPercent: 12.5,
          demandMode: 'MANUAL',
          supportedDemand: 8,
          minContributionPolicy: { minUnitContribution: 5 },
          minAllowedPrice: 20
        },
        recommendation,
        managerName: 'Auditor Maya'
      });

      assert.equal(record.schemaVersion, CURRENT_SCHEMA_VERSION);
      assert.ok(record.id.startsWith('DEC-'));
      assert.equal(record.decisionStatus, 'APPROVED_MARKDOWN');
      assert.equal(record.managerName, 'Auditor Maya');

      // Batch Snapshot
      assert.equal(record.batchSnapshot.batchId, 'B1');
      assert.equal(record.batchSnapshot.startingQuantity, 10);
      assert.equal(record.batchSnapshot.originalSellingPrice, 40);
      assert.equal(record.batchSnapshot.incrementalCostPerUnit, 25);
      assert.equal(record.batchSnapshot.isExpired, false);

      // Scenario Snapshot
      assert.equal(record.scenarioSnapshot.proposedSellingPrice, 35);
      assert.equal(record.scenarioSnapshot.markdownPercentage, 12.5);
      assert.equal(record.scenarioSnapshot.inputDemand, 8);

      // Calculated Outcome
      assert.equal(record.calculatedOutcome.projectedQuantitySold, 8);
      assert.equal(record.calculatedOutcome.projectedUnsoldQuantity, 2);
      assert.equal(record.calculatedOutcome.unitContribution, 10);
      assert.equal(record.calculatedOutcome.projectedContribution, 80);
      assert.equal(record.calculatedOutcome.projectedRevenue, 280);

      // Provenance
      assert.equal(record.provenance.source, 'FYND_C30_SIMULATOR');
      assert.equal(record.provenance.synthetic, true);
      assert.ok(record.provenance.disclaimer.includes('Saved decision scenario record'));
    });

    test('generates cryptographically unique decision IDs for successive records', () => {
      const rec = generateRecommendation(validBatchB1);
      const r1 = createDecisionRecord({ batch: validBatchB1, recommendation: rec });
      const r2 = createDecisionRecord({ batch: validBatchB1, recommendation: rec });

      assert.notEqual(r1.id, r2.id);
      assert.ok(r1.id.startsWith('DEC-'));
      assert.ok(r2.id.startsWith('DEC-'));
    });

    test('preserves immutable snapshot when original batch object is modified later', () => {
      const mutableBatch = { ...validBatchB1 };
      const rec = generateRecommendation(mutableBatch);
      const record = createDecisionRecord({ batch: mutableBatch, recommendation: rec });

      assert.equal(record.batchSnapshot.startingQuantity, 10);

      // Mutate live batch
      mutableBatch.qty = 0;
      mutableBatch.originalPrice = 999;

      // Historical record must remain unaffected
      assert.equal(record.batchSnapshot.startingQuantity, 10);
      assert.equal(record.batchSnapshot.originalSellingPrice, 40);
    });
  });

  describe('2. Validation & Food Safety Invariants', () => {
    test('validates compliant decision record successfully', () => {
      const rec = generateRecommendation(validBatchB1, { proposedPrice: 35, supportedDemand: 10 });
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });

      const validation = validateDecisionRecord(record);
      assert.equal(validation.valid, true);
      assert.equal(validation.errors.length, 0);
    });

    test('rejects non-object or null record', () => {
      assert.equal(validateDecisionRecord(null).valid, false);
      assert.equal(validateDecisionRecord('invalid').valid, false);
    });

    test('rejects record with unsupported schema version', () => {
      const rec = generateRecommendation(validBatchB1);
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });
      record.schemaVersion = '2.5.0';

      const validation = validateDecisionRecord(record);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some(e => e.code === 'UNSUPPORTED_SCHEMA_VERSION'));
    });

    test('rejects record with invalid decision ID prefix', () => {
      const rec = generateRecommendation(validBatchB1);
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });
      record.id = 'TXN-12345';

      const validation = validateDecisionRecord(record);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some(e => e.code === 'INVALID_DECISION_ID'));
    });

    test('rejects record if allocated units exceed starting stock', () => {
      const rec = generateRecommendation(validBatchB1);
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });
      record.calculatedOutcome.projectedQuantitySold = 25; // starting stock is 10
      record.allocatedQuantity = 25;

      const validation = validateDecisionRecord(record);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some(e => e.code === 'ALLOCATED_EXCEEDS_STOCK'));
    });

    test('STRICT FOOD SAFETY: rejects saving expired stock as an approved markdown sale', () => {
      const rec = generateRecommendation(expiredBatchB2);
      const record = createDecisionRecord({ batch: expiredBatchB2, recommendation: rec });

      // Intentionally tamper with status to simulate illegal bypass attempt
      record.decisionStatus = 'APPROVED_MARKDOWN';

      const validation = validateDecisionRecord(record);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some(e => e.code === 'SAFETY_VIOLATION_APPROVED_SALE'));
    });

    test('STRICT FOOD SAFETY: rejects saving expired stock with non-zero allocated sales', () => {
      const rec = generateRecommendation(expiredBatchB2);
      const record = createDecisionRecord({ batch: expiredBatchB2, recommendation: rec });

      // Intentionally tamper with allocated sold quantity
      record.calculatedOutcome.projectedQuantitySold = 5;
      record.allocatedQuantity = 5;

      const validation = validateDecisionRecord(record);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some(e => e.code === 'SAFETY_VIOLATION_ALLOCATION'));
    });

    test('accepts expired stock properly recorded as BLOCKED_DISPOSAL with 0 sales', () => {
      const rec = generateRecommendation(expiredBatchB2);
      const record = createDecisionRecord({ batch: expiredBatchB2, recommendation: rec });

      assert.equal(record.decisionStatus, 'BLOCKED_DISPOSAL');
      assert.equal(record.calculatedOutcome.projectedQuantitySold, 0);

      const validation = validateDecisionRecord(record);
      assert.equal(validation.valid, true);
    });
  });

  describe('3. Persistence & LocalStorage Handling', () => {
    test('persists a decision record and reloads it cleanly', () => {
      const rec = generateRecommendation(validBatchB1, { proposedPrice: 35, supportedDemand: 10 });
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });

      const saved = saveDecision(record);
      assert.equal(saved.length, 1);
      assert.equal(saved[0].id, record.id);

      const loaded = getStoredDecisions();
      assert.equal(loaded.length, 1);
      assert.equal(loaded[0].id, record.id);
      assert.equal(loaded[0].batchSnapshot.batchId, 'B1');
      assert.equal(loaded[0].calculatedOutcome.projectedContribution, 100);
    });

    test('preserves multiple decisions with newest saved first', () => {
      const rec1 = generateRecommendation(validBatchB1, { proposedPrice: 35, supportedDemand: 5 });
      const record1 = createDecisionRecord({ batch: validBatchB1, recommendation: rec1 });

      const rec2 = generateRecommendation(validBatchB1, { proposedPrice: 30, supportedDemand: 10 });
      const record2 = createDecisionRecord({ batch: validBatchB1, recommendation: rec2 });

      saveDecision(record1);
      const updated = saveDecision(record2);

      assert.equal(updated.length, 2);
      assert.equal(updated[0].id, record2.id); // newest first
      assert.equal(updated[1].id, record1.id);
    });

    test('retrieves single decision by ID via getStoredDecisionById', () => {
      const rec = generateRecommendation(validBatchB1);
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });
      saveDecision(record);

      const found = getStoredDecisionById(record.id);
      assert.ok(found);
      assert.equal(found.id, record.id);
      assert.equal(getStoredDecisionById('NON_EXISTENT'), null);
    });

    test('duplicate protection: rejects adding duplicate record with identical ID', () => {
      const rec = generateRecommendation(validBatchB1);
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });

      saveDecision(record);
      const secondAttempt = saveDecision(record);

      // Storage should still contain only 1 record
      assert.equal(secondAttempt.length, 1);
      assert.equal(getStoredDecisions().length, 1);
    });

    test('handles empty storage gracefully returning empty array', () => {
      clearStoredDecisions();
      const records = getStoredDecisions();
      assert.deepEqual(records, []);
    });

    test('defensive recovery: does not crash or erase storage when encountering malformed JSON', () => {
      window.localStorage.setItem(DECISIONS_STORAGE_KEY, '{corrupted-raw-json:');

      // Must return empty array without throwing
      const records = getStoredDecisions();
      assert.deepEqual(records, []);

      // Critical: Must NOT erase the raw corrupted data silently
      assert.equal(window.localStorage.getItem(DECISIONS_STORAGE_KEY), '{corrupted-raw-json:');
    });

    test('handles storage quota exceptions gracefully with descriptive error', () => {
      // Mock setItem to throw quota error
      window.localStorage.setItem = () => {
        const quotaErr = new Error('QuotaExceededError: DOM Exception 22');
        quotaErr.name = 'QuotaExceededError';
        throw quotaErr;
      };

      const rec = generateRecommendation(validBatchB1);
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });

      assert.throws(
        () => saveDecision(record),
        /Storage write failed/
      );
    });
  });

  describe('4. Semantic Integrity & Projection Semantics', () => {
    test('enforces that projected contribution and sold units are never claimed as actuals', () => {
      const rec = generateRecommendation(validBatchB1, { proposedPrice: 38, supportedDemand: 10 });
      const record = createDecisionRecord({ batch: validBatchB1, recommendation: rec });

      // Verifies snapshot keys are explicitly projected
      assert.ok('projectedQuantitySold' in record.calculatedOutcome);
      assert.ok('projectedUnsoldQuantity' in record.calculatedOutcome);
      assert.ok('projectedContribution' in record.calculatedOutcome);
      assert.ok('projectedRevenue' in record.calculatedOutcome);

      // Must NOT contain realized / actual revenue fields
      assert.equal(record.calculatedOutcome.actualUnitsSold, undefined);
      assert.equal(record.calculatedOutcome.realizedRevenue, undefined);
      assert.equal(record.calculatedOutcome.wasteAvoidedKg, undefined);
    });
  });
});
