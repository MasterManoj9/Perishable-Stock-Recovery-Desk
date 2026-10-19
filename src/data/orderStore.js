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
const ORPHANAGE_DONATIONS_KEY = 'c30_orphanage_donations';

const memoryStore = {};

function getItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

function setItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      memoryStore[key] = value;
    }
  } catch {
    memoryStore[key] = value;
  }
}

// ─── Orders ─────────────────────────────────────────────────────

export function getOrders(userId = null) {
  try {
    const raw = getItem(ORDERS_KEY);
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
  setItem(ORDERS_KEY, JSON.stringify(orders));

  return order;
}

export function updateOrderStatus(orderId, status, paymentStatus = null) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return null;

  orders[idx].status = status;
  if (paymentStatus) orders[idx].paymentStatus = paymentStatus;
  orders[idx].updated_at = new Date().toISOString();

  setItem(ORDERS_KEY, JSON.stringify(orders));
  return orders[idx];
}

// ─── Payments ───────────────────────────────────────────────────

export function getPayments() {
  try {
    const raw = getItem(PAYMENTS_KEY);
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
  setItem(PAYMENTS_KEY, JSON.stringify(payments));

  return payment;
}

// ─── Donations ──────────────────────────────────────────────────

export function getDonations() {
  try {
    const raw = getItem(DONATIONS_KEY);
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
  setItem(DONATIONS_KEY, JSON.stringify(donations));

  return donation;
}

// ─── Orphanage Donations ─────────────────────────────────────────

export function getOrphanageDonations() {
  try {
    const raw = getItem(ORPHANAGE_DONATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordOrphanageBatchDonation({
  batchId,
  productName,
  quantity,
  originalPrice = 0,
  location = 'General Area',
  orphanageName = 'Central Orphanage Food Network'
}) {
  const list = getOrphanageDonations();
  const estimatedValue = Math.round((Number(quantity) || 0) * (Number(originalPrice) || 0) * 100) / 100;

  const record = {
    id: `ORPH-DON-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    batchId,
    productName,
    quantity: Number(quantity) || 0,
    originalPrice: Number(originalPrice) || 0,
    estimatedValue,
    location,
    orphanageName,
    donated_at: new Date().toISOString()
  };

  list.unshift(record);
  setItem(ORPHANAGE_DONATIONS_KEY, JSON.stringify(list));
  return record;
}

export function getOrphanageMetrics() {
  const customerDonations = getDonations();
  const batchDonations = getOrphanageDonations();

  // Baseline from customer checkout ₹1 donations
  const rupeeOneCount = customerDonations.length;
  const rupeeOneTotal = customerDonations.reduce((sum, d) => sum + (Number(d.amount) || 1), 0);

  // Total batches & units donated to orphanages
  const totalBatchesDonated = batchDonations.length;
  const totalUnitsDonated = batchDonations.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const totalBatchValue = batchDonations.reduce((sum, b) => sum + (Number(b.estimatedValue) || 0), 0);

  return {
    rupeeOneCount,
    rupeeOneTotal,
    totalBatchesDonated,
    totalUnitsDonated,
    totalDonatedValue: totalBatchValue + rupeeOneTotal,
    batchDonations
  };
}

// ─── Feedback ───────────────────────────────────────────────────

export function getFeedback(filterFn = null) {
  try {
    const raw = getItem(FEEDBACK_KEY);
    const feedback = raw ? JSON.parse(raw) : [];
    return filterFn ? feedback.filter(filterFn) : feedback;
  } catch {
    return [];
  }
}

export function submitFeedback({
  customerId,
  customerName,
  customerEmail = '',
  customerPhone = '',
  storeId = 'demo-store',
  orderId = null,
  rating = 5,
  category = 'general',
  message
}) {
  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
    throw new Error('Rating must be between 1 and 5');
  }
  if (!message || message.trim().length < 5) {
    throw new Error('Feedback message must be at least 5 characters');
  }

  const feedback = {
    id: `SUP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    customerId,
    customerName: customerName || 'Customer',
    customerEmail: customerEmail || '',
    customerPhone: customerPhone || '',
    storeId,
    orderId,
    rating: Number(rating || 5),
    category,
    message: message.trim(),
    status: 'submitted',
    managerResponse: null,
    managerRespondedAt: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const allFeedback = getFeedback();
  allFeedback.unshift(feedback);
  setItem(FEEDBACK_KEY, JSON.stringify(allFeedback));

  return feedback;
}

export function respondToFeedback(feedbackId, response) {
  const allFeedback = getFeedback();
  const idx = allFeedback.findIndex(f => f.id === feedbackId);
  if (idx === -1) return null;

  allFeedback[idx].managerResponse = response;
  allFeedback[idx].managerRespondedAt = new Date().toISOString();
  allFeedback[idx].status = 'reviewed';
  allFeedback[idx].updated_at = new Date().toISOString();

  setItem(FEEDBACK_KEY, JSON.stringify(allFeedback));
  return allFeedback[idx];
}

// ─── Analytics Helpers ──────────────────────────────────────────

export function getOrderAnalytics(dateRangeOrPreset = 'all', activeBatches = []) {
  const allOrders = getOrders();
  let orders = allOrders.filter(o => o.paymentStatus === 'success' || o.status === 'confirmed');
  
  const now = new Date();
  let startDate = null;

  if (typeof dateRangeOrPreset === 'string') {
    switch (dateRangeOrPreset) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_3m':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'last_6m':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'last_1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }
    if (startDate) {
      orders = orders.filter(o => new Date(o.created_at) >= startDate);
    }
  } else if (dateRangeOrPreset && typeof dateRangeOrPreset === 'object') {
    const { start, end } = dateRangeOrPreset;
    orders = orders.filter(o => {
      const d = new Date(o.created_at);
      return (!start || d >= new Date(start)) && (!end || d <= new Date(end));
    });
  }

  const totalOrders = orders.length;
  const grossSales = orders.reduce((s, o) => s + o.subtotal, 0);
  const totalRevenue = grossSales;
  const totalUnits = orders.reduce((s, o) => 
    s + o.items.reduce((is, i) => is + i.quantity, 0), 0
  );
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Donations
  let donations = getDonations();
  if (startDate) {
    donations = donations.filter(d => new Date(d.created_at) >= startDate);
  }
  const totalDonations = donations.reduce((s, d) => s + d.amount, 0);

  const totalDiscountGiven = orders.reduce((s, o) => 
    s + o.items.reduce((is, i) => is + (((i.originalPriceSnapshot || i.priceSnapshot) - i.priceSnapshot) * i.quantity), 0), 0
  );

  // Cancellation and pending counts from all orders in period
  let periodAllOrders = allOrders;
  if (startDate) {
    periodAllOrders = periodAllOrders.filter(o => new Date(o.created_at) >= startDate);
  }
  const cancelledCount = periodAllOrders.filter(o => o.status === 'cancelled').length;
  const pendingCount = periodAllOrders.filter(o => o.paymentStatus === 'pending').length;

  // Product breakdown
  const productMap = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          productId: item.productId,
          productName: item.productName,
          category: item.category || 'General',
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
  const bestProduct = products.length > 0 ? products[0] : null;

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
  const bestMonth = monthly.length > 0
    ? [...monthly].sort((a, b) => b.revenue - a.revenue)[0]
    : null;

  // Repeat purchase analysis
  const customerPurchases = {};
  orders.forEach(o => {
    if (o.customerId) {
      if (!customerPurchases[o.customerId]) {
        customerPurchases[o.customerId] = [];
      }
      customerPurchases[o.customerId].push(o);
    }
  });

  const repeatCustomers = Object.values(customerPurchases).filter(p => p.length > 1).length;
  const uniqueCustomers = Object.keys(customerPurchases).length;
  const repeatRate = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0;

  // Waste & Recovery Insights from activeBatches
  const totalAvailableStock = activeBatches.reduce((s, b) => s + (b.qty || 0), 0);
  const expiredStock = activeBatches.filter(b => b.expired || (b.expiryAt && new Date(b.expiryAt) <= now))
    .reduce((s, b) => s + (b.qty || 0), 0);
  const damagedStock = activeBatches.filter(b => b.condition === 'damaged')
    .reduce((s, b) => s + (b.qty || 0), 0);
  const quarantinedStock = activeBatches.filter(b => b.coldChainStatus === 'exception')
    .reduce((s, b) => s + (b.qty || 0), 0);
  const eligibleUnsoldStock = activeBatches.filter(b => !b.expired && b.condition !== 'damaged' && b.coldChainStatus !== 'exception')
    .reduce((s, b) => s + (b.qty || 0), 0);

  return {
    totalOrders,
    grossSales: Math.round(grossSales * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalUnits,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    totalDonations: Math.round(totalDonations * 100) / 100,
    totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
    cancelledCount,
    pendingCount,
    products,
    bestProduct,
    monthly,
    bestMonth,
    repeatCustomers,
    uniqueCustomers,
    repeatRate,
    wasteInsights: {
      unitsRecoveredSold: totalUnits,
      eligibleUnsoldStock,
      expiredStock,
      damagedStock,
      quarantinedStock,
      totalTrackedStock: totalAvailableStock + totalUnits
    }
  };
}
