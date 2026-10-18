import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOrder,
  getOrderById,
  recordPayment,
  recordDonation,
  getDonations,
  submitFeedback,
  respondToFeedback,
  getFeedback
} from '../data/orderStore.js';

test('Order, Payment, Donation & Feedback Lifecycle Tests', async (t) => {
  await t.test('1. Preserves immutable price snapshot on order items', () => {
    const order = createOrder({
      customerId: 'cust-101',
      customerName: 'Aarav Sharma',
      items: [
        { productId: 'OGY-200', productName: 'Greek Yogurt', price: 40, originalPrice: 60, discount: 33, quantity: 2 }
      ],
      subtotal: 80,
      donationAmount: 1,
      total: 81
    });

    assert.equal(order.items[0].priceSnapshot, 40);
    assert.equal(order.items[0].originalPriceSnapshot, 60);
    assert.equal(order.items[0].discountPercentage, 33);
    assert.equal(order.items[0].lineTotal, 80);
    assert.equal(order.subtotal, 80);
    assert.equal(order.donationAmount, 1);
    assert.equal(order.total, 81);
    assert.equal(order.status, 'pending');
  });

  await t.test('2. Enforces that donation is recorded ONLY when payment is verified', () => {
    // Unverified payment attempt -> returns null, no donation ledger entry
    const unverified = recordDonation({
      customerId: 'cust-102',
      customerName: 'Priya Patel',
      orderId: 'ORD-TEST-001',
      amount: 1,
      paymentVerified: false
    });
    assert.equal(unverified, null);

    // Verified payment -> records donation successfully
    const verified = recordDonation({
      customerId: 'cust-102',
      customerName: 'Priya Patel',
      orderId: 'ORD-TEST-002',
      amount: 1,
      paymentVerified: true
    });
    assert.ok(verified);
    assert.equal(verified.amount, 1);
    assert.equal(verified.status, 'verified');
  });

  await t.test('3. Enforces idempotency on payments and donations', () => {
    const orderId = 'ORD-IDEMPOTENT-001';

    // First payment recording
    const p1 = recordPayment({ orderId, amount: 150, status: 'success' });
    // Second payment recording for same order
    const p2 = recordPayment({ orderId, amount: 150, status: 'success' });
    assert.equal(p1.id, p2.id);

    // First donation recording
    const d1 = recordDonation({ customerId: 'cust-X', orderId, amount: 1, paymentVerified: true });
    // Second donation recording for same order
    const d2 = recordDonation({ customerId: 'cust-X', orderId, amount: 1, paymentVerified: true });
    assert.equal(d1.id, d2.id);
  });

  await t.test('4. Validates customer feedback constraints', () => {
    // Invalid rating (> 5)
    assert.throws(() => {
      submitFeedback({
        customerId: 'cust-103',
        customerName: 'Rohan',
        rating: 6,
        message: 'Great fresh produce!'
      });
    }, /Rating must be between 1 and 5/);

    // Too short message (< 5 chars)
    assert.throws(() => {
      submitFeedback({
        customerId: 'cust-103',
        customerName: 'Rohan',
        rating: 4,
        message: 'Ok'
      });
    }, /Feedback message must be at least 5 characters/);

    // Valid feedback
    const fb = submitFeedback({
      customerId: 'cust-103',
      customerName: 'Rohan',
      rating: 5,
      category: 'product_quality',
      message: 'Excellent quality berries at an amazing price!'
    });
    assert.equal(fb.rating, 5);
    assert.equal(fb.status, 'submitted');

    // Manager response
    const updated = respondToFeedback(fb.id, 'Thank you for supporting food waste reduction!');
    assert.equal(updated.status, 'reviewed');
    assert.equal(updated.managerResponse, 'Thank you for supporting food waste reduction!');
  });
});
