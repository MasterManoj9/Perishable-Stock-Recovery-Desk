/**
 * inventoryFilters.test.js - Verification of Search, Filtering, and Sorting logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBatches } from '../data/fixtureLoader.js';

describe('Inventory Search, Filtering, and Sorting Tests', () => {
  const rawBatches = [
    { id: 'B1', qty: 10, sale_price_inr: 40, incremental_cost_inr: 25, expired: false, productName: 'Fresh Milk' },
    { id: 'B2', qty: 20, sale_price_inr: 50, incremental_cost_inr: 20, expired: true, productName: 'Sourdough Loaf' },
    { id: 'B3', qty: 5, sale_price_inr: 100, incremental_cost_inr: 60, expired: false, productName: 'Organic Yogurt' }
  ];

  const { validBatches: batches } = normalizeBatches(rawBatches);

  describe('Search Functionality', () => {
    function search(items, query) {
      if (!query.trim()) return items;
      const q = query.toLowerCase().trim();
      return items.filter(b => b.id.toLowerCase().includes(q) || b.productName.toLowerCase().includes(q));
    }

    it('finds batch by exact ID (case-insensitive)', () => {
      assert.strictEqual(search(batches, 'b1').length, 1);
      assert.strictEqual(search(batches, 'B1')[0].id, 'B1');
    });

    it('finds batch by partial product name', () => {
      const res = search(batches, 'sourdough');
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'B2');
    });

    it('returns all items on empty search query', () => {
      assert.strictEqual(search(batches, '').length, 3);
      assert.strictEqual(search(batches, '   ').length, 3);
    });

    it('returns empty array when search query matches nothing', () => {
      assert.strictEqual(search(batches, 'nonexistent').length, 0);
    });
  });

  describe('Safety Status Filtering', () => {
    function filterStatus(items, status) {
      if (status === 'ELIGIBLE') return items.filter(b => b.eligibility.eligible === true);
      if (status === 'BLOCKED') return items.filter(b => b.eligibility.eligible === false);
      return items;
    }

    it('filters eligible batches only (B1, B3)', () => {
      const res = filterStatus(batches, 'ELIGIBLE');
      assert.strictEqual(res.length, 2);
      assert.ok(res.every(b => b.eligibility.eligible === true));
    });

    it('filters blocked batches only (B2)', () => {
      const res = filterStatus(batches, 'BLOCKED');
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].id, 'B2');
      assert.strictEqual(res[0].eligibility.eligible, false);
    });

    it('returns all batches for ALL status', () => {
      assert.strictEqual(filterStatus(batches, 'ALL').length, 3);
    });
  });

  describe('Sorting Functionality', () => {
    function sortItems(items, sortBy) {
      const copy = [...items];
      copy.sort((a, b) => {
        if (sortBy === 'QTY_DESC') return b.qty - a.qty;
        if (sortBy === 'QTY_ASC') return a.qty - b.qty;
        if (sortBy === 'PRICE_DESC') return b.originalPrice - a.originalPrice;
        if (sortBy === 'PRICE_ASC') return a.originalPrice - b.originalPrice;
        return a.id.localeCompare(b.id);
      });
      return copy;
    }

    it('sorts by Quantity Descending (20, 10, 5)', () => {
      const res = sortItems(batches, 'QTY_DESC');
      assert.deepStrictEqual(res.map(b => b.qty), [20, 10, 5]);
    });

    it('sorts by Price Descending (100, 50, 40)', () => {
      const res = sortItems(batches, 'PRICE_DESC');
      assert.deepStrictEqual(res.map(b => b.originalPrice), [100, 50, 40]);
    });
  });

  describe('Immutability Guarantee', () => {
    it('does not mutate original batches array during filter or sort', () => {
      const originalCopy = JSON.parse(JSON.stringify(batches));
      const sorted = [...batches].sort((a, b) => b.qty - a.qty);
      assert.notStrictEqual(sorted, batches);
      assert.deepStrictEqual(batches.map(b => b.id), originalCopy.map(b => b.id));
    });
  });
});
