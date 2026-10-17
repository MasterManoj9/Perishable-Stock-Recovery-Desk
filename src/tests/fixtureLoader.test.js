/**
 * fixtureLoader.test.js - Normalization and defensive fixture loading tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBatches, getProductDisplayName } from '../data/fixtureLoader.js';

describe('Fixture Loader & Normalization Tests', () => {
  it('assigns friendly display names to known batches B1 and B2', () => {
    assert.strictEqual(getProductDisplayName('B1'), 'Fresh Dairy Milk (1L Pouch)');
    assert.strictEqual(getProductDisplayName('B2'), 'Artisan Sourdough Loaf (400g)');
    assert.strictEqual(getProductDisplayName('B99'), 'Perishable Inventory (B99)');
  });

  it('normalizes valid fixture batches with calculated unit margins and eligibility', () => {
    const raw = [
      { id: 'B1', qty: 10, sale_price_inr: 40, incremental_cost_inr: 25, expired: false }
    ];
    const { validBatches, invalidRecords } = normalizeBatches(raw);

    assert.strictEqual(validBatches.length, 1);
    assert.strictEqual(invalidRecords.length, 0);

    const b1 = validBatches[0];
    assert.strictEqual(b1.id, 'B1');
    assert.strictEqual(b1.qty, 10);
    assert.strictEqual(b1.originalPrice, 40);
    assert.strictEqual(b1.incrementalCost, 25);
    assert.strictEqual(b1.unitMargin, 15);
    assert.strictEqual(b1.eligibility.eligible, true);
    assert.strictEqual(b1.eligibility.sellableQuantity, 10);
  });

  it('segregates invalid records without crashing or discarding them silently', () => {
    const raw = [
      { id: 'B1', qty: 10, sale_price_inr: 40, incremental_cost_inr: 25, expired: false },
      { id: 'B_INVALID', qty: -5, sale_price_inr: 40, incremental_cost_inr: 25, expired: false }
    ];

    const { validBatches, invalidRecords } = normalizeBatches(raw);

    assert.strictEqual(validBatches.length, 1);
    assert.strictEqual(invalidRecords.length, 1);
    assert.strictEqual(invalidRecords[0].raw.id, 'B_INVALID');
    assert.ok(invalidRecords[0].errors.some(e => e.field === 'qty'));
  });

  it('handles empty or non-array raw batches safely', () => {
    assert.deepStrictEqual(normalizeBatches(null), { validBatches: [], invalidRecords: [] });
    assert.deepStrictEqual(normalizeBatches([]), { validBatches: [], invalidRecords: [] });
    assert.deepStrictEqual(normalizeBatches(undefined), { validBatches: [], invalidRecords: [] });
  });
});
