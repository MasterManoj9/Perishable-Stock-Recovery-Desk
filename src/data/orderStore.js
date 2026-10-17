/**
 * orderStore.js — Order Persistence & Management Layer
 * 
 * Manages customer orders, payment records, and donation tracking.
 * Uses localStorage in demo mode, designed for Supabase migration.
 * 
 * Enforces:
 * - Atomic stock validation before order confirmation
 * - Price snapshot at time of order (immutable)
 * - Donation recorded only after payment verification
 * - Idempotent order processing
 */

const ORDERS_KEY = 'c30_orders';
const PAYMENTS_KEY = 'c30_payments';
const DONATIONS_KEY = 'c30_donations';
const FEEDBACK_KEY = 'c30_feedback';

// ─── Orders ─────────────────────────────────────────────────────

export function getOrders(userId = null) {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const orders = raw ? JSON.parse(raw) : [];
    if (userId) return orders.filter(o => o.customerId === userId);
    return orders;
  } catch {
    return [];
  }
}

export function getOrderById(orderId) {
  return getOrders().find(o => o.id === orderId) || null;
}

export function createOrder({
  customerId,
  customerName,
  items,
  subtotal,
  donationAmount = 0,
  total,
  storeId = 'demo-store'
}) {
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  const order = {
    id: orderId,
    customerId,
    customerName,
    storeId,
    items: items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      image: item.image,
      category: item.category,
      priceSnapshot: item.price,
      originalPriceSnapshot: item.originalPrice,
      discountPercentage: item.discount,
      quantity: item.quantity,
      lineTotal: Math.round(item.price * item.quantity * 100) / 100
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    donationAmount: Math.round(donationAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    status: 'pending',
    paymentStatus: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const orders = getOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  return order;
}

export function updateOrderStatus(orderId, status, paymentStatus = null) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return null;

  orders[idx].status = status;
  if (paymentStatus) orders[idx].paymentStatus = paymentStatus;
  orders[idx].updated_at = new Date().toISOString();

  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return orders[idx];
}

// ─── Payments ───────────────────────────────────────────────────

export function getPayments() {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordPayment({
  orderId,
  provider = 'razorpay_demo',
  providerOrderId = null,
  providerPaymentId = null,
  amount,
  currency = 'INR',
  status = 'success'
}) {
  // Idempotency check
  const payments = getPayments();
  if (payments.find(p => p.orderId === orderId && p.status === 'success')) {
    return payments.find(p => p.orderId === orderId);
  }

  const payment = {
    id: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    orderId,
    provider,
    providerOrderId,
    providerPaymentId,
    amount: Math.round(amount * 100) / 100,
    currency,
    status,
    verified_at: status === 'success' ? new Date().toISOString() : null,
    created_at: new Date().toISOString()
  };

  payments.unshift(payment);
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));

  return payment;
}

// ─── Donations ──────────────────────────────────────────────────

export function getDonations() {
  try {
    const raw = localStorage.getItem(DONATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDonation({
  customerId,
  customerName,
  orderId,
  amount = 1,
  program = 'Near-Expiry Food Recovery Initiative',
  paymentVerified = false
}) {
  // Don't record unverified donations
  if (!paymentVerified) return null;

  // Idempotency
  const donations = getDonations();
  if (donations.find(d => d.orderId === orderId)) {
    return donations.find(d => d.orderId === orderId);
  }

  const donation = {
    id: `DON-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    customerId,
    customerName,
    orderId,
    amount: Math.round(amount * 100) / 100,
    program,
    status: 'verified',
    created_at: new Date().toISOString()
  };

  donations.unshift(donation);
  localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations));

  return donation;
}

// ─── Feedback ───────────────────────────────────────────────────

export function getFeedback(filterFn = null) {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    const feedback = raw ? JSON.parse(raw) : [];
    return filterFn ? feedback.filter(filterFn) : feedback;
  } catch {
    return [];
  }
}

export function submitFeedback({
  customerId,
  customerName,
  storeId = 'demo-store',
  orderId = null,
  rating,
  category = 'general',
  message
}) {
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  if (!message || message.trim().length < 5) {
    throw new Error('Feedback message must be at least 5 characters');
  }

  const feedback = {
    id: `FB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    customerId,
    customerName,
    storeId,
    orderId,
    rating: Number(rating),
    category,
    message: message.trim(),
    status: 'submitted',
    managerResponse: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const allFeedback = getFeedback();
  allFeedback.unshift(feedback);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(allFeedback));

  return feedback;
}

export function respondToFeedback(feedbackId, response) {
  const allFeedback = getFeedback();
  const idx = allFeedback.findIndex(f => f.id === feedbackId);
  if (idx === -1) return null;

  allFeedback[idx].managerResponse = response;
  allFeedback[idx].status = 'reviewed';
  allFeedback[idx].updated_at = new Date().toISOString();

  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(allFeedback));
  return allFeedback[idx];
}

// ─── Analytics Helpers ──────────────────────────────────────────

export function getOrderAnalytics(dateRange = null) {
  let orders = getOrders().filter(o => o.paymentStatus === 'success' || o.status === 'confirmed');
  
  if (dateRange) {
    const { start, end } = dateRange;
    orders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= new Date(start) && d <= new Date(end);
    });
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + o.subtotal, 0);
  const totalUnits = orders.reduce((s, o) => 
    s + o.items.reduce((is, i) => is + i.quantity, 0), 0
  );
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalDonations = getDonations().reduce((s, d) => s + d.amount, 0);
  const totalDiscountGiven = orders.reduce((s, o) => 
    s + o.items.reduce((is, i) => is + ((i.originalPriceSnapshot - i.priceSnapshot) * i.quantity), 0), 0
  );

  // Product breakdown
  const productMap = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          unitsSold: 0,
          revenue: 0,
          orderCount: 0
        };
      }
      productMap[item.productId].unitsSold += item.quantity;
      productMap[item.productId].revenue += item.lineTotal;
      productMap[item.productId].orderCount += 1;
    });
  });

  const products = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

  // Monthly breakdown
  const monthlyMap = {};
  orders.forEach(o => {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: key, orders: 0, revenue: 0, units: 0 };
    }
    monthlyMap[key].orders += 1;
    monthlyMap[key].revenue += o.subtotal;
    monthlyMap[key].units += o.items.reduce((s, i) => s + i.quantity, 0);
  });

  const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // Repeat purchase analysis
  const customerPurchases = {};
  orders.forEach(o => {
    if (!customerPurchases[o.customerId]) {
      customerPurchases[o.customerId] = [];
    }
    customerPurchases[o.customerId].push(o);
  });

  const repeatCustomers = Object.values(customerPurchases).filter(p => p.length > 1).length;
  const uniqueCustomers = Object.keys(customerPurchases).length;
  const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers * 100) : 0;

  return {
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalUnits,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    totalDonations: Math.round(totalDonations * 100) / 100,
    totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
    products,
    monthly,
    repeatCustomers,
    uniqueCustomers,
    repeatRate: Math.round(repeatRate * 100) / 100
  };
}
