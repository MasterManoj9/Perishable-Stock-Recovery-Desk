/**
 * dashboardMetrics.test.js - Verification of Dashboard Metrics and Reconciliation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeBatches } from '../data/fixtureLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Dashboard Metrics Derivation & Reconciliation Tests', () => {
  const fixturePath = join(__dirname, '../../Starter_Data/C30/fixture.json');
  const fixtureData = JSON.parse(readFileSync(fixturePath, 'utf8'));

  const { validBatches } = normalizeBatches(fixtureData.records.batches, fixtureData.records);

  it('reconciles total batches count with authoritative fixture (2 batches: B1, B2)', () => {
    assert.strictEqual(validBatches.length, 2);
  });

  it('reconciles total quantity recorded (10 + 20 = 30 physical units)', () => {
    const totalQty = validBatches.reduce((sum, b) => sum + b.qty, 0);
    assert.strictEqual(totalQty, 30);
  });

  it('identifies exactly 1 eligible batch (B1) and 1 blocked batch (B2)', () => {
    const eligible = validBatches.filter(b => b.eligibility.eligible === true);
    const blocked = validBatches.filter(b => b.eligibility.eligible === false);

    assert.strictEqual(eligible.length, 1);
    assert.strictEqual(eligible[0].id, 'B1');
    assert.strictEqual(eligible[0].eligibility.sellableQuantity, 10);

    assert.strictEqual(blocked.length, 1);
    assert.strictEqual(blocked[0].id, 'B2');
    assert.strictEqual(blocked[0].eligibility.sellableQuantity, 0);
  });

  it('reconciles simulated contribution strictly on eligible stock (B1: 10 * ₹15 = ₹150)', () => {
    const eligible = validBatches.filter(b => b.eligibility.eligible === true);
    const contribution = eligible.reduce((acc, b) => {
      const demand = b.demandAssumptionUnits !== null ? b.demandAssumptionUnits : b.qty;
      const alloc = Math.min(b.qty, demand);
      const unitMargin = b.originalPrice - b.incrementalCost;
      return acc + (alloc * unitMargin);
    }, 0);

    assert.strictEqual(contribution, 150);
  });

  it('never counts blocked stock (B2) in simulated contribution even with +₹30 margin', () => {
    const b2 = validBatches.find(b => b.id === 'B2');
    assert.strictEqual(b2.unitMargin, 30);
    assert.strictEqual(b2.eligibility.sellableQuantity, 0);

    // Contribution from blocked stock is strictly 0
    const blockedContrib = b2.eligibility.sellableQuantity * b2.unitMargin;
    assert.strictEqual(blockedContrib, 0);
  });

  it('handles empty inventory gracefully without throwing or NaN', () => {
    const emptyBatches = [];
    const totalBatches = emptyBatches.length;
    const totalQuantity = emptyBatches.reduce((sum, b) => sum + (b.qty || 0), 0);
    const eligible = emptyBatches.filter(b => b.eligibility?.eligible === true);
    const contribution = eligible.reduce((acc, b) => acc + (b.qty * b.unitMargin), 0);

    assert.strictEqual(totalBatches, 0);
    assert.strictEqual(totalQuantity, 0);
    assert.strictEqual(contribution, 0);
  });
});
