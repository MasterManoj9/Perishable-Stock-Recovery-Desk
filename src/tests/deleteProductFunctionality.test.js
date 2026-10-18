import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deleteBatch, getBatches } from '../data/supabaseAdapter.js';

test('FYND — Delete Product Functionality & Supabase Archive Tests', async (t) => {
  // Mock localStorage for Node test runner
  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
  };

  await t.test('1. Migration 005_product_deletion_and_archive.sql exists and contains valid safe schema', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/005_product_deletion_and_archive.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 005 file must exist in supabase/migrations');
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.match(sql, /ALTER TABLE (public\.)?inventory_batches\s+ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ/i);
    assert.match(sql, /ALTER TABLE (public\.)?products\s+ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ/i);
    assert.match(sql, /idx_inventory_batches_active/i);
    assert.match(sql, /idx_products_active/i);
    assert.match(sql, /delete_inventory_batch/i);
    assert.match(sql, /deleted_at IS NULL/i);
    // Crucial safety check: ensure historical orders are never cascaded
    assert.doesNotMatch(sql, /ON DELETE CASCADE.*orders/i);
    assert.doesNotMatch(sql, /ON DELETE CASCADE.*order_items/i);
  });

  await t.test('2. deleteBatch rejects invocation with missing identifiers', async () => {
    await assert.rejects(
      async () => {
        await deleteBatch(null);
      },
      /Batch identifier missing/i
    );

    await assert.rejects(
      async () => {
        await deleteBatch({});
      },
      /Batch identifier missing/i
    );
  });

  await t.test('3. deleteBatch successfully removes product from storage cache without touching other items', async () => {
    const batchA = {
      id: 'B-DEL-001',
      dbId: '11111111-1111-1111-1111-111111111111',
      productName: 'Organic Milk',
      qty: 10,
      originalPrice: 75
    };
    const batchB = {
      id: 'B-KEEP-002',
      dbId: '22222222-2222-2222-2222-222222222222',
      productName: 'Sourdough Bread',
      qty: 5,
      originalPrice: 90
    };

    localStorage.setItem('c30_user_batches', JSON.stringify([batchA, batchB]));

    // Invoke delete on batch A
    const res = await deleteBatch(batchA);
    assert.equal(res.success, true);
    assert.equal(res.batchCode, 'B-DEL-001');

    // Verify localStorage now only has batch B
    const remaining = JSON.parse(localStorage.getItem('c30_user_batches'));
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'B-KEEP-002');
    assert.equal(remaining[0].productName, 'Sourdough Bread');
  });

  await t.test('4. getBatches excludes soft-deleted records from active manager and customer queries', async () => {
    const activeItem = {
      id: 'B-ACT-101',
      productName: 'Fresh Strawberries',
      qty: 8,
      originalPrice: 120,
      incrementalCost: 80,
      currentPrice: 120,
      allowedMarkdownPercent: 30,
      expiryAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      condition: 'good',
      coldChainStatus: 'compliant',
      expired: false
    };

    localStorage.setItem('c30_user_batches', JSON.stringify([activeItem]));

    const managerBatches = await getBatches({ isManager: true });
    assert.ok(managerBatches.some(b => b.id === 'B-ACT-101'));

    const customerBatches = await getBatches({ isManager: false });
    assert.ok(customerBatches.some(b => b.id === 'B-ACT-101'));

    // Now delete it
    await deleteBatch(activeItem);

    const postDeleteManager = await getBatches({ isManager: true });
    assert.ok(!postDeleteManager.some(b => b.id === 'B-ACT-101'), 'Deleted product must not appear in manager inventory');

    const postDeleteCustomer = await getBatches({ isManager: false });
    assert.ok(!postDeleteCustomer.some(b => b.id === 'B-ACT-101'), 'Deleted product must not appear in customer shop');
  });

  await t.test('5. DeleteProductModal component exists and provides guarded confirmation UI', () => {
    const modalPath = path.resolve(process.cwd(), 'src/features/inventory/DeleteProductModal.jsx');
    assert.ok(fs.existsSync(modalPath), 'DeleteProductModal.jsx must exist');
    const content = fs.readFileSync(modalPath, 'utf8');
    assert.match(content, /export function DeleteProductModal/);
    assert.match(content, /Delete Product\?/);
    assert.match(content, /Are you sure you want to delete/);
    assert.match(content, /Cancel/);
    assert.match(content, /isDeleting/);
    assert.match(content, /Deleting Product\.\.\./);
  });
});
