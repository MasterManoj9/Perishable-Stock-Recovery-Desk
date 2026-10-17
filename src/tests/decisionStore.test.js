import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvField,
  generateDecisionsCsv
} from '../data/decisionStore.js';

describe('Decision Store & CSV Export Engine Tests', () => {
  describe('RFC 4180 CSV Field Escaping', () => {
    test('wraps plain string in quotes', () => {
      assert.equal(escapeCsvField('B1'), '"B1"');
    });

    test('handles null and undefined safely without throwing', () => {
      assert.equal(escapeCsvField(null), '""');
      assert.equal(escapeCsvField(undefined), '""');
    });

    test('escapes internal quotes by doubling them per RFC 4180', () => {
      assert.equal(escapeCsvField('Milk "Organic" 1L'), '"Milk ""Organic"" 1L"');
    });

    test('handles fields containing commas and newlines safely', () => {
      const complex = 'Item 1, Grade A\nStore #4';
      const escaped = escapeCsvField(complex);
      assert.equal(escaped, '"Item 1, Grade A\nStore #4"');
    });
  });

  describe('CSV Generation from Decisions', () => {
    test('generates header row and formatted data rows with CRLF line breaks', () => {
      const mockDecisions = [
        {
          id: 'DEC-101',
          timestampFormatted: '17 Oct 2026, 10:00 AM',
          batchId: 'B1',
          productName: 'Fresh Dairy Milk',
          actionType: 'RECOMMEND_MARKDOWN_SALE',
          eligible: true,
          originalPrice: 40,
          proposedPrice: 35,
          incrementalCost: 25,
          unitContribution: 10,
          allocatedQuantity: 10,
          unsoldQuantity: 0,
          unmetDemand: 0,
          totalContribution: 100,
          managerName: 'Demo Manager',
          explanation: 'Approved markdown sale.'
        }
      ];

      const csv = generateDecisionsCsv(mockDecisions);
      const lines = csv.split('\r\n');

      assert.equal(lines.length, 2);
      assert.ok(lines[0].includes('Decision ID'));
      assert.ok(lines[0].includes('Total Contribution'));
      assert.ok(lines[1].includes('"DEC-101"'));
      assert.ok(lines[1].includes('"B1"'));
      assert.ok(lines[1].includes('"Fresh Dairy Milk"'));
      assert.ok(lines[1].includes('"100"'));
    });

    test('handles empty decisions array gracefully', () => {
      const csv = generateDecisionsCsv([]);
      assert.ok(csv.startsWith('Decision ID,Timestamp'));
      assert.equal(csv.split('\r\n').length, 1);
    });
  });
});
