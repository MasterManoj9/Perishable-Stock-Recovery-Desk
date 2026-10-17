/**
 * economics.test.js - Economics & Financial Contribution Engine Tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateUnitContribution,
  calculateTotalContribution,
  calculateDiscountPercent,
  checkAllowedMarkdownLimit,
  checkMinimumContribution,
  roundCurrency
} from '../domain/economics.js';

describe('Economics Engine Tests', () => {
  describe('Mandatory Numerical Case', () => {
    it('calculates unit contribution: ₹40 - ₹25 = ₹15', () => {
      const unitContrib = calculateUnitContribution(40, 25);
      assert.strictEqual(unitContrib, 15);
    });

    it('calculates total contribution: 10 units * ₹15 = ₹150', () => {
      const unitContrib = calculateUnitContribution(40, 25);
      const totalContrib = calculateTotalContribution(unitContrib, 10);
      assert.strictEqual(totalContrib, 150);
    });
  });

  describe('Currency Rounding and Decimals', () => {
    it('handles decimal prices and costs with consistent rounding to 2 decimals', () => {
      assert.strictEqual(roundCurrency(15.346), 15.35);
      assert.strictEqual(roundCurrency(15.344), 15.34);
      const unit = calculateUnitContribution(39.99, 24.50);
      assert.strictEqual(unit, 15.49);
      const total = calculateTotalContribution(unit, 3);
      assert.strictEqual(total, 46.47);
    });

    it('throws when passed negative or invalid numbers', () => {
      assert.throws(() => calculateUnitContribution(-40, 25));
      assert.throws(() => calculateUnitContribution(40, -25));
      assert.throws(() => calculateTotalContribution(15, -1));
      assert.throws(() => calculateTotalContribution(15, 2.5));
    });
  });

  describe('Discount Percentage', () => {
    it('calculates discount percentage accurately', () => {
      assert.strictEqual(calculateDiscountPercent(100, 75), 25);
      assert.strictEqual(calculateDiscountPercent(100, 100), 0);
      assert.strictEqual(calculateDiscountPercent(50, 40), 20);
    });
  });

  describe('Allowed Markdown Limits', () => {
    it('approves markdown within allowed percentage', () => {
      const res = checkAllowedMarkdownLimit(100, 70, 30);
      assert.strictEqual(res.compliant, true);
    });

    it('rejects markdown exceeding allowed percentage', () => {
      const res = checkAllowedMarkdownLimit(100, 65, 30);
      assert.strictEqual(res.compliant, false);
      assert.strictEqual(res.minAllowedPrice, 70);
      assert.ok(res.reason.includes('exceeds maximum allowed markdown'));
    });
  });

  describe('Minimum Contribution Policy', () => {
    it('approves positive contribution', () => {
      const res = checkMinimumContribution(15, { minUnitContribution: 0 });
      assert.strictEqual(res.compliant, true);
    });

    it('rejects negative contribution (selling price below incremental cost)', () => {
      const res = checkMinimumContribution(-5, { minUnitContribution: 0 });
      assert.strictEqual(res.compliant, false);
      assert.ok(res.reason.includes('below required minimum threshold'));
    });

    it('enforces custom store minimum threshold (e.g. ₹10 minimum margin)', () => {
      const res = checkMinimumContribution(5, { minUnitContribution: 10 });
      assert.strictEqual(res.compliant, false);
      assert.ok(res.reason.includes('below required minimum threshold of ₹10'));
    });
  });
});
