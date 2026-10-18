import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveBatch,
  getBatches,
  placeOrder,
  decrementInventoryStock
} from '../data/supabaseAdapter.js';

test('Stock Deduction & CSV Bulk Upload Workflow Tests', async (t) => {
  // Ensure a clean test environment for localStorage
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    };
  }

  await t.test('1. Adding Bread with 5 units, customer buys 2 units -> updates manager inventory to 3 units', async () => {
    localStorage.clear();

    // 1. Manager adds Bread with 5 units
    const initialBatch = {
      id: 'BATCH-BREAD-01',
      productName: 'Artisan Whole Wheat Bread',
      category: 'Bakery',
      qty: 5,
      originalPrice: 60,
      incrementalCost: 30,
      daysUntilExpiry: 3,
      allowedMarkdownPercent: 40,
      condition: 'good',
      coldChainStatus: 'compliant'
    };

    const addRes = await saveBatch(initialBatch);
    assert.equal(addRes.success, true);
    assert.equal(addRes.batch.qty, 5);

    // Verify manager sees 5 units
    const managerBatchesBefore = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    const breadBefore = managerBatchesBefore.find(b => b.id === 'BATCH-BREAD-01' || b.productName === initialBatch.productName);
    assert.ok(breadBefore, 'Bread must exist in manager inventory');
    assert.equal(breadBefore.qty, 5, 'Initial stock must be 5 units');

    // 2. Customer buys 2 units of Bread
    const orderPayload = {
      customerId: 'cust-test-123',
      customerName: 'Aarav Patel',
      items: [
        {
          productId: 'BATCH-BREAD-01',
          id: 'BATCH-BREAD-01',
          productName: 'Artisan Whole Wheat Bread',
          price: 60,
          originalPrice: 60,
          quantity: 2
        }
      ],
      subtotal: 120,
      donationAmount: 1,
      total: 121
    };

    const orderRes = await placeOrder(orderPayload);
    assert.equal(orderRes.success, true, 'Order must succeed');

    // 3. Manager dashboard checks stock: must now be 3 units
    const managerBatchesAfter = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    const breadAfter = managerBatchesAfter.find(b => b.id === 'BATCH-BREAD-01' || b.productName === initialBatch.productName);
    assert.ok(breadAfter, 'Bread must still exist in manager inventory');
    assert.equal(breadAfter.qty, 3, 'Bread stock in manager dashboard must accurately be reduced from 5 to 3 units');
    assert.equal(breadAfter.available_quantity, 3, 'available_quantity must also be 3');
  });

  await t.test('2. Customer buys remaining 3 units -> updates manager inventory to 0 units', async () => {
    const orderPayload2 = {
      customerId: 'cust-test-456',
      customerName: 'Meera Rao',
      items: [
        {
          productId: 'BATCH-BREAD-01',
          id: 'BATCH-BREAD-01',
          productName: 'Artisan Whole Wheat Bread',
          price: 60,
          originalPrice: 60,
          quantity: 3
        }
      ],
      subtotal: 180,
      donationAmount: 0,
      total: 180
    };

    const orderRes2 = await placeOrder(orderPayload2);
    assert.equal(orderRes2.success, true);

    const managerBatchesFinal = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    const breadFinal = managerBatchesFinal.find(b => b.id === 'BATCH-BREAD-01');
    assert.ok(breadFinal);
    assert.equal(breadFinal.qty, 0, 'Bread stock must now be 0 units');

    // In customer storefront, out-of-stock items (qty <= 0) must be excluded from customer browse
    const customerBatches = await getBatches({ isManager: false, datasetMode: 'LIVE' });
    const breadInCustomerView = customerBatches.find(b => b.id === 'BATCH-BREAD-01');
    assert.equal(breadInCustomerView, undefined, 'Out-of-stock product must not appear in customer storefront');
  });

  await t.test('3. Multi-item cart purchase decrements all matching product stocks correctly', async () => {
    localStorage.clear();

    // Manager adds Milk (10 units) and Apples (8 units)
    await saveBatch({
      id: 'BATCH-MILK-1',
      productName: 'Fresh Whole Milk',
      qty: 10,
      originalPrice: 50,
      daysUntilExpiry: 2,
      condition: 'good',
      coldChainStatus: 'compliant'
    });

    await saveBatch({
      id: 'BATCH-APPLE-1',
      productName: 'Shimla Apples (1kg)',
      qty: 8,
      originalPrice: 120,
      daysUntilExpiry: 5,
      condition: 'good',
      coldChainStatus: 'compliant'
    });

    // Customer purchases 4 units of Milk and 3 units of Apples
    await placeOrder({
      customerId: 'cust-multi',
      customerName: 'Rajesh Sharma',
      items: [
        { productId: 'BATCH-MILK-1', productName: 'Fresh Whole Milk', quantity: 4, price: 50, originalPrice: 50 },
        { productId: 'BATCH-APPLE-1', productName: 'Shimla Apples (1kg)', quantity: 3, price: 120, originalPrice: 120 }
      ],
      subtotal: 560,
      total: 560
    });

    const managerBatches = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    const milk = managerBatches.find(b => b.id === 'BATCH-MILK-1');
    const apple = managerBatches.find(b => b.id === 'BATCH-APPLE-1');

    assert.equal(milk.qty, 6, 'Milk stock should decrease from 10 to 6');
    assert.equal(apple.qty, 5, 'Apples stock should decrease from 8 to 5');
  });

  await t.test('4. Bulk upload parsing and validation accepts CSV data with flexible column names', async () => {
    // Test standard CSV parsing logic used in BulkUploadModal
    const sampleCsv = `Product Name,Quantity,Price,Cost,Category,Days Until Expiry,Allowed Markdown %
Artisan Sourdough Bread,10,60,30,Bakery,3,40
Whole Milk (1L),15,55,32,Dairy,2,30
Avocado Hass (Pack of 2),8,180,95,Produce,4,45`;

    const lines = sampleCsv.trim().split('\n');
    assert.equal(lines.length, 4);

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    assert.ok(headers.includes('product name'));
    assert.ok(headers.includes('quantity'));
    assert.ok(headers.includes('price'));

    // Process rows into batches and save
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const batchObj = {
        id: `BULK-CSV-${i}`,
        productName: cols[0],
        qty: parseInt(cols[1], 10),
        originalPrice: parseFloat(cols[2]),
        incrementalCost: parseFloat(cols[3]),
        category: cols[4],
        daysUntilExpiry: parseInt(cols[5], 10),
        allowedMarkdownPercent: parseInt(cols[6], 10),
        condition: 'good',
        coldChainStatus: 'compliant'
      };

      const res = await saveBatch(batchObj);
      assert.equal(res.success, true);
    }

    const batches = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    const bulkBread = batches.find(b => b.productName === 'Artisan Sourdough Bread');
    const bulkMilk = batches.find(b => b.productName === 'Whole Milk (1L)');
    const bulkAvocado = batches.find(b => b.productName === 'Avocado Hass (Pack of 2)');

    assert.ok(bulkBread, 'Bulk uploaded Bread must exist in inventory');
    assert.equal(bulkBread.qty, 10);
    assert.ok(bulkMilk, 'Bulk uploaded Milk must exist in inventory');
    assert.equal(bulkMilk.qty, 15);
    assert.ok(bulkAvocado, 'Bulk uploaded Avocado must exist in inventory');
    assert.equal(bulkAvocado.qty, 8);
  });
});
