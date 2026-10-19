import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveBatch,
  getBatches,
  updateBatch,
  getDonations,
  recordDonation,
  getOrphanageDonations,
  recordOrphanageBatchDonation,
  getOrphanageMetrics
} from '../data/supabaseAdapter.js';

test('Immediate Action: Donate to Orphans & Keep More Discount Tests', async (t) => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    };
  }

  await t.test('1. Categorizes items into Expiring within 3 Days and Low Sale Rate', async () => {
    localStorage.clear();

    // Batch 1: Expiring soon (2 days left)
    const expiringBatch = {
      id: 'B-EXP-01',
      productName: 'Organic Strawberries',
      category: 'Produce',
      qty: 15,
      originalPrice: 120,
      daysUntilExpiry: 2,
      expiringSoon: true,
      condition: 'good',
      coldChainStatus: 'compliant'
    };

    // Batch 2: Low sale rate (40 units in stock, demand assumption only 10)
    const slowMovingBatch = {
      id: 'B-SLOW-01',
      productName: 'Canned Artisan Beans',
      category: 'General',
      qty: 40,
      originalPrice: 80,
      daysUntilExpiry: 15,
      demandAssumptionUnits: 10,
      demandEvidence: 'Available (Low)',
      condition: 'good',
      coldChainStatus: 'compliant'
    };

    await saveBatch(expiringBatch);
    await saveBatch(slowMovingBatch);

    const allBatches = await getBatches({ isManager: true, datasetMode: 'LIVE' });

    // Expiring within 3 days filter test
    const expiringItems = allBatches.filter(b => {
      const days = b.daysUntilExpiry !== undefined ? Number(b.daysUntilExpiry) : null;
      return (b.expiringSoon === true || (days !== null && days <= 3 && days >= 0)) && !b.expired && (b.qty || 0) > 0;
    });

    assert.ok(expiringItems.some(b => b.id === 'B-EXP-01'), 'Must include Organic Strawberries in expiring within 3 days');

    // Low sale rate filter test
    const lowSaleRateItems = allBatches.filter(b => {
      const qty = Number(b.qty || 0);
      const demand = Number(b.demandAssumptionUnits || b.demandAssumption || 0);
      return ((demand > 0 && demand < qty) || b.demandEvidence === 'Available (Low)') && !b.expired && qty > 0;
    });

    assert.ok(lowSaleRateItems.some(b => b.id === 'B-SLOW-01'), 'Must include slow moving batch in low sale rate section');
  });

  await t.test('2. Donate to Orphans records donation, updates ₹1 metrics and zeroes out inventory', async () => {
    localStorage.clear();

    // 1. Customer places orders and contributes ₹1 donations
    recordDonation({ customerId: 'cust-1', customerName: 'Aarav', orderId: 'ORD-1', amount: 1, paymentVerified: true });
    recordDonation({ customerId: 'cust-2', customerName: 'Diya', orderId: 'ORD-2', amount: 1, paymentVerified: true });
    recordDonation({ customerId: 'cust-3', customerName: 'Rohan', orderId: 'ORD-3', amount: 1, paymentVerified: true });

    // Verify ₹1 metric
    let metrics = getOrphanageMetrics();
    assert.equal(metrics.rupeeOneCount, 3, 'Must track 3 ₹1 customer donations');
    assert.equal(metrics.rupeeOneTotal, 3, 'Must have ₹3 total collected from ₹1 donations');

    // 2. Manager donates a near-expiry batch to an orphanage
    const batchToDonate = {
      id: 'B-DONATE-01',
      productName: 'Fresh Mozzarella Balls',
      category: 'Dairy',
      qty: 8,
      originalPrice: 150,
      daysUntilExpiry: 1,
      condition: 'good',
      coldChainStatus: 'compliant'
    };
    await saveBatch(batchToDonate);

    // Record orphanage batch donation
    const donationRecord = recordOrphanageBatchDonation({
      batchId: 'B-DONATE-01',
      productName: 'Fresh Mozzarella Balls',
      quantity: 8,
      originalPrice: 150,
      location: 'North Zone (Within 5 km radius)',
      orphanageName: 'Central Orphanage Food Recovery Hub'
    });

    assert.ok(donationRecord.id.startsWith('ORPH-DON-'));
    assert.equal(donationRecord.estimatedValue, 8 * 150); // ₹1,200

    // Update batch quantity to 0 (all donated)
    await updateBatch({
      ...batchToDonate,
      qty: 0,
      available_quantity: 0,
      condition: 'donated'
    });

    // Check orphanage metrics reflect updated totals
    metrics = getOrphanageMetrics();
    assert.equal(metrics.totalBatchesDonated, 1);
    assert.equal(metrics.totalUnitsDonated, 8);
    assert.equal(metrics.totalDonatedValue, 1200 + 3); // 1200 batch value + 3 rupee donations

    // Check inventory reflects 0 stock for that batch
    const managerBatches = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    const donatedBatch = managerBatches.find(b => b.id === 'B-DONATE-01');
    assert.equal(donatedBatch.qty, 0, 'Donated batch stock must be reduced to 0 in inventory');

    // Check customer storefront hides donated/out-of-stock items
    const customerBatches = await getBatches({ isManager: false, datasetMode: 'LIVE' });
    assert.equal(customerBatches.find(b => b.id === 'B-DONATE-01'), undefined, 'Donated stock must not appear in customer storefront');
  });

  await t.test('3. Keep More Discount adjusts clearance price and reflects in inventory and customer shop', async () => {
    localStorage.clear();

    const batch = {
      id: 'B-DISCOUNT-01',
      productName: 'Artisan Sourdough Loaf',
      category: 'Bakery',
      qty: 12,
      originalPrice: 100,
      incrementalCost: 40,
      allowedMarkdownPercent: 40, // 40% initial -> ₹60
      daysUntilExpiry: 2,
      condition: 'good',
      coldChainStatus: 'compliant'
    };
    await saveBatch(batch);

    // Initial price check in customer view
    let customerProducts = await getBatches({ isManager: false, datasetMode: 'LIVE' });
    let prod = customerProducts.find(b => b.id === 'B-DISCOUNT-01');
    assert.ok(prod);
    assert.equal(prod.allowedMarkdownPercent, 40);

    // Manager uses the discount slider bar to set a deeper clearance markdown of 70%
    const newDiscount = 70;
    const newPrice = Math.round(batch.originalPrice * (1 - newDiscount / 100)); // ₹30
    assert.equal(newPrice, 30);

    const updatedBatch = {
      ...batch,
      allowedMarkdownPercent: newDiscount,
      allowed_markdown_percent: newDiscount,
      currentPrice: newPrice,
      sale_price_inr: newPrice,
      discountedPrice: newPrice
    };

    await updateBatch(updatedBatch);

    // 1. Verify Manager Inventory reflection
    const managerBatches = await getBatches({ isManager: true, datasetMode: 'LIVE' });
    const managerItem = managerBatches.find(b => b.id === 'B-DISCOUNT-01');
    assert.equal(managerItem.allowedMarkdownPercent, 70, 'Manager inventory must reflect 70% allowed markdown');
    assert.equal(managerItem.currentPrice, 30, 'Manager inventory must reflect ₹30 current clearance price');

    // 2. Verify Customer Storefront reflection
    customerProducts = await getBatches({ isManager: false, datasetMode: 'LIVE' });
    const customerItem = customerProducts.find(b => b.id === 'B-DISCOUNT-01');
    assert.equal(customerItem.allowedMarkdownPercent, 70, 'Customer storefront must reflect 70% discount');
    
    // Test customer price calculation (used in ShopPage.jsx)
    const customerCalculatedPrice = Math.round(customerItem.originalPrice * (1 - customerItem.allowedMarkdownPercent / 100));
    assert.equal(customerCalculatedPrice, 30, 'Customer price must be ₹30 (was ₹60 before more discount was kept)');
  });
});
