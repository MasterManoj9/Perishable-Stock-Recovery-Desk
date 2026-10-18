import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrderAnalytics, createOrder, recordPayment, recordDonation, updateOrderStatus } from '../data/orderStore.js';

test('Business Insights Engine Tests', async (t) => {
  // Clear any existing test data in localStorage before tests
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.clear();
  }

  await t.test('1. Calculates zero metrics correctly for empty order history', () => {
    const analytics = getOrderAnalytics('all', []);
    assert.equal(analytics.totalOrders, 0);
    assert.equal(analytics.totalRevenue, 0);
    assert.equal(analytics.totalUnits, 0);
    assert.equal(analytics.avgOrderValue, 0);
    assert.equal(analytics.totalDonations, 0);
    assert.equal(analytics.repeatRate, 0);
    assert.equal(analytics.products.length, 0);
  });

  await t.test('2. Accurately calculates sales, units, and repeat purchase rate from real order records', () => {
    // Create Order 1 for Customer A
    const order1 = createOrder({
      customerId: 'cust-A',
      customerName: 'Customer Alpha',
      items: [
        { productId: 'P1', productName: 'Greek Yogurt', price: 40, originalPrice: 60, discount: 33, quantity: 2 }
      ],
      subtotal: 80,
      donationAmount: 1,
      total: 81
    });
    recordPayment({ orderId: order1.id, amount: 81, status: 'success' });
    updateOrderStatus(order1.id, 'confirmed', 'success');
    recordDonation({ customerId: 'cust-A', customerName: 'Customer Alpha', orderId: order1.id, amount: 1, paymentVerified: true });

    // Create Order 2 for Customer A (making Customer A a repeat customer!)
    const order2 = createOrder({
      customerId: 'cust-A',
      customerName: 'Customer Alpha',
      items: [
        { productId: 'P2', productName: 'Almond Milk', price: 50, originalPrice: 90, discount: 44, quantity: 1 }
      ],
      subtotal: 50,
      donationAmount: 0,
      total: 50
    });
    recordPayment({ orderId: order2.id, amount: 50, status: 'success' });
    updateOrderStatus(order2.id, 'confirmed', 'success');

    // Create Order 3 for Customer B (single purchase)
    const order3 = createOrder({
      customerId: 'cust-B',
      customerName: 'Customer Beta',
      items: [
        { productId: 'P1', productName: 'Greek Yogurt', price: 40, originalPrice: 60, discount: 33, quantity: 3 }
      ],
      subtotal: 120,
      donationAmount: 1,
      total: 121
    });
    recordPayment({ orderId: order3.id, amount: 121, status: 'success' });
    updateOrderStatus(order3.id, 'confirmed', 'success');
    recordDonation({ customerId: 'cust-B', customerName: 'Customer Beta', orderId: order3.id, amount: 1, paymentVerified: true });

    // Run Analytics
    const analytics = getOrderAnalytics('all', []);

    // 3 orders confirmed/paid: total revenue = 80 + 50 + 120 = 250
    assert.equal(analytics.totalOrders, 3);
    assert.equal(analytics.totalRevenue, 250);
    // Total units = 2 + 1 + 3 = 6
    assert.equal(analytics.totalUnits, 6);
    // Total verified donations = 1 + 1 = 2
    assert.equal(analytics.totalDonations, 2);

    // Repeat Purchase Analysis:
    // 2 unique customers (cust-A, cust-B)
    // 1 repeat customer (cust-A with 2 orders)
    // Repeat rate = (1 / 2) * 100 = 50%
    assert.equal(analytics.uniqueCustomers, 2);
    assert.equal(analytics.repeatCustomers, 1);
    assert.equal(analytics.repeatRate, 50);

    // Product Ranking
    assert.equal(analytics.products.length, 2);
    // P1 (Greek Yogurt): units = 2 + 3 = 5, revenue = 80 + 120 = 200
    // P2 (Almond Milk): units = 1, revenue = 50
    assert.equal(analytics.bestProduct.productId, 'P1');
    assert.equal(analytics.bestProduct.unitsSold, 5);
    assert.equal(analytics.bestProduct.revenue, 200);
  });

  await t.test('3. Categorizes inventory recovery vs waste outcomes correctly', () => {
    const mockBatches = [
      { id: 'B1', qty: 10, expired: false, condition: 'good', coldChainStatus: 'compliant' },
      { id: 'B2', qty: 8, expired: true, condition: 'good', coldChainStatus: 'compliant' },
      { id: 'B3', qty: 5, expired: false, condition: 'damaged', coldChainStatus: 'compliant' },
      { id: 'B4', qty: 12, expired: false, condition: 'good', coldChainStatus: 'exception' }
    ];

    const analytics = getOrderAnalytics('all', mockBatches);
    const waste = analytics.wasteInsights;

    assert.equal(waste.eligibleUnsoldStock, 10);
    assert.equal(waste.expiredStock, 8);
    assert.equal(waste.damagedStock, 5);
    assert.equal(waste.quarantinedStock, 12);
  });
});
