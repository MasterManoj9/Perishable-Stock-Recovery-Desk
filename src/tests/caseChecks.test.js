/**
 * caseChecks.test.js - Verification of the 3 Mandatory Case Checks in Exact Printed Order
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runMandatoryCaseChecks } from '../domain/caseChecksRunner.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Mandatory Case Outcome Checks (In Exact Printed Order)', () => {
  const fixturePath = join(__dirname, '../../Starter_Data/C30/fixture.json');
  let fixtureData = null;
  try {
    fixtureData = JSON.parse(readFileSync(fixturePath, 'utf8'));
  } catch (err) {
    // If not found, runner falls back safely
  }

  const results = runMandatoryCaseChecks(fixtureData);

  it('Check 1 (10 pts) — Contribution: 10 units @ ₹40 with ₹25 cost yields ₹150', () => {
    const check1 = results.find(r => r.id === 'CASE_CHECK_1');
    assert.ok(check1, 'Case Check 1 must exist');
    assert.strictEqual(check1.order, 1, 'Check 1 must be first in printed order');
    assert.strictEqual(check1.actual.unitContribution, 15, 'Unit contribution must be exactly 15');
    assert.strictEqual(check1.actual.totalContribution, 150, 'Total contribution must be exactly 150');
    assert.strictEqual(check1.passed, true, 'Case Check 1 must PASS');
  });

  it('Check 2 (10 pts) — Expired Stock Blocked: B2 with attractive margin (+₹30) is blocked', () => {
    const check2 = results.find(r => r.id === 'CASE_CHECK_2');
    assert.ok(check2, 'Case Check 2 must exist');
    assert.strictEqual(check2.order, 2, 'Check 2 must be second in printed order');
    assert.strictEqual(check2.actual.eligible, false, 'Expired batch must not be eligible');
    assert.strictEqual(check2.actual.sellableQuantity, 0, 'Sellable quantity must be 0');
    assert.strictEqual(check2.actual.allocatedQuantity, 0, 'Allocated quantity must be 0');
    assert.strictEqual(check2.actual.approvedContribution, 0, 'Approved contribution must be 0');
    assert.ok(check2.actual.reason && check2.actual.reason.length > 0, 'Reason must be provided');
    assert.strictEqual(check2.passed, true, 'Case Check 2 must PASS');
  });

  it('Check 3 (5 pts) — Demand Cap & Unsold Stock Visibility', () => {
    const check3 = results.find(r => r.id === 'CASE_CHECK_3');
    assert.ok(check3, 'Case Check 3 must exist');
    assert.strictEqual(check3.order, 3, 'Check 3 must be third in printed order');

    // Part A: 8 available, 12 demand -> 8 allocated, 0 unsold, 4 unmet
    assert.strictEqual(check3.actual.scenarioA.allocated, 8, 'Scenario A allocated must be 8');
    assert.strictEqual(check3.actual.scenarioA.unsold, 0, 'Scenario A unsold must be 0');
    assert.strictEqual(check3.actual.scenarioA.unmetDemand, 4, 'Scenario A unmet demand must be 4');

    // Part B: 12 available, 8 demand -> 8 allocated, 4 unsold, 0 unmet
    assert.strictEqual(check3.actual.scenarioB.allocated, 8, 'Scenario B allocated must be 8');
    assert.strictEqual(check3.actual.scenarioB.unsold, 4, 'Scenario B unsold must be 4');
    assert.strictEqual(check3.actual.scenarioB.unmetDemand, 0, 'Scenario B unmet demand must be 0');

    assert.strictEqual(check3.passed, true, 'Case Check 3 must PASS');
  });
});
