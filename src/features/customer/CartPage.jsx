/**
 * CartPage.jsx — Shopping Cart & Checkout
 * 
 * Displays cart items, quantity controls, donation checkbox,
 * order summary, and checkout flow with Razorpay integration.
 */

import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Heart, ArrowRight, ShoppingBag, CreditCard, Check, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useCart } from '../../lib/cartContext.js';
import { useAuth } from '../../lib/auth.js';
import { useNotifications } from '../../lib/notificationContext.js';
import { createOrder, updateOrderStatus, recordPayment, recordDonation } from '../../data/orderStore.js';

export function CartPage({ onNavigate, batches = [] }) {
  const { items, subtotal, totalDiscount, donationEnabled, donationAmount, total, updateQuantity, removeItem, clearCart, toggleDonation, itemCount } = useCart();
  const { user, profile } = useAuth();
  const { addNotification } = useNotifications();
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'review' | 'processing' | 'success'
  const [lastOrder, setLastOrder] = useState(null);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckoutStep('review');
  };

  const handleConfirmPayment = async () => {
    setCheckoutStep('processing');

    try {
      // 1. Create order with price snapshots
      const order = createOrder({
        customerId: user?.id || 'guest',
        customerName: profile?.full_name || 'Guest',
        items,
        subtotal,
        donationAmount,
        total
      });

      // 2. Simulate payment (In production, this would be Razorpay)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Record payment
      recordPayment({
        orderId: order.id,
        provider: 'razorpay_demo',
        amount: total,
        status: 'success'
      });

      // 4. Update order status
      updateOrderStatus(order.id, 'confirmed', 'success');

      // 5. Record donation if enabled
      if (donationEnabled && donationAmount > 0) {
        recordDonation({
          customerId: user?.id || 'guest',
          customerName: profile?.full_name || 'Guest',
          orderId: order.id,
          amount: donationAmount,
          paymentVerified: true
        });
      }

      // 6. Send notifications
      addNotification({
        type: 'order',
        title: 'Order Confirmed! 🎉',
        message: `Your order ${order.id} has been confirmed. Total: ₹${total}`,
        relatedType: 'order',
        relatedId: order.id
      });

      // Notify manager
      addNotification({
        type: 'order',
        title: 'New Order Received',
        message: `Order ${order.id} from ${profile?.full_name || 'Customer'}. Total: ₹${total}`,
        relatedType: 'order',
        relatedId: order.id,
        recipientId: 'manager-001'
      });

      if (donationEnabled) {
        addNotification({
          type: 'donation',
          title: 'Donation Received ❤️',
          message: `₹${donationAmount} donated by ${profile?.full_name || 'Customer'} with order ${order.id}`,
          relatedType: 'donation',
          relatedId: order.id,
          recipientId: 'manager-001'
        });
      }

      setLastOrder(order);
      setCheckoutStep('success');
      clearCart();
    } catch (err) {
      console.error('Checkout failed:', err);
      setCheckoutStep('cart');
    }
  };

  // ─── Success Screen ──────────────────────────────────────────

  if (checkoutStep === 'success' && lastOrder) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
          <Check className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h2>
        <p className="text-slate-500 mb-2">Your order has been placed successfully</p>
        <p className="text-sm font-mono text-slate-600 bg-slate-100 inline-block px-3 py-1 rounded-lg mb-6">
          {lastOrder.id}
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 text-left">
          <h3 className="font-semibold text-sm text-slate-800 mb-3">Order Summary</h3>
          {lastOrder.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-600">{item.productName} × {item.quantity}</span>
              <span className="font-medium">₹{item.lineTotal}</span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between font-semibold">
            <span>Total Paid</span>
            <span className="text-emerald-600">₹{lastOrder.total}</span>
          </div>
          {lastOrder.donationAmount > 0 && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <Heart className="w-3 h-3" /> Includes ₹{lastOrder.donationAmount} donation
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('orders')}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
          >
            View My Orders
          </button>
          <button
            onClick={() => { setCheckoutStep('cart'); setLastOrder(null); onNavigate('shop'); }}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // ─── Processing Screen ────────────────────────────────────────

  if (checkoutStep === 'processing') {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-6 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Processing Payment...</h2>
        <p className="text-slate-500 text-sm">Please wait while we confirm your order</p>
      </div>
    );
  }

  // ─── Review Screen ────────────────────────────────────────────

  if (checkoutStep === 'review') {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setCheckoutStep('cart')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Cart
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-6">Review Your Order</h2>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <h3 className="font-semibold text-sm text-slate-700 mb-4">Order Items</h3>
          {items.map(item => (
            <div key={item.productId} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
              <span className="text-3xl">{item.image}</span>
              <div className="flex-1">
                <p className="font-medium text-sm text-slate-800">{item.productName}</p>
                <p className="text-xs text-slate-500">₹{item.price} × {item.quantity}</p>
              </div>
              <p className="font-semibold text-sm">₹{Math.round(item.price * item.quantity * 100) / 100}</p>
            </div>
          ))}
        </div>

        {/* Donation Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={donationEnabled}
              onChange={toggleDonation}
              className="mt-1 w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
              id="donation-check"
            />
            <label htmlFor="donation-check" className="flex-1 cursor-pointer">
              <p className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Add ₹1 to support our food recovery initiative
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Help support our food recovery initiative with an optional ₹1 contribution. 
                We aim to reduce avoidable food waste by coordinating eligible near-expiry products 
                with participating charitable organizations. Products that are expired, damaged, 
                or unsafe will never be sold or donated for consumption.
              </p>
            </label>
          </div>
        </div>

        {/* Order Total */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({itemCount} items)</span>
              <span>₹{subtotal}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Savings</span>
                <span>-₹{totalDiscount}</span>
              </div>
            )}
            {donationEnabled && (
              <div className="flex justify-between text-rose-600">
                <span>Donation ❤️</span>
                <span>₹{donationAmount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="text-emerald-600">₹{total}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleConfirmPayment}
          className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-base"
        >
          <CreditCard className="w-5 h-5" />
          Pay ₹{total}
        </button>

        <p className="text-[11px] text-slate-400 text-center mt-3">
          Demo Mode: Payment is simulated. In production, Razorpay secure checkout is used.
        </p>
      </div>
    );
  }

  // ─── Cart View ────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 text-sm mb-6">Start shopping to add items to your cart</p>
        <button
          onClick={() => onNavigate('shop')}
          className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 mb-6">
        Shopping Cart <span className="text-slate-400 font-normal text-base">({itemCount} items)</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={item.productId} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4">
              <span className="text-4xl">{item.image}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-800 truncate">{item.productName}</h3>
                <p className="text-xs text-slate-500">{item.category}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-bold text-emerald-600">₹{item.price}</span>
                  {item.discount > 0 && (
                    <span className="text-xs text-slate-400 line-through">₹{item.originalPrice}</span>
                  )}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="font-bold text-sm w-16 text-right">
                ₹{Math.round(item.price * item.quantity * 100) / 100}
              </p>

              <button
                onClick={() => removeItem(item.productId)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
            <h3 className="font-bold text-slate-900 mb-4">Order Summary</h3>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>You Save</span>
                  <span>-₹{totalDiscount}</span>
                </div>
              )}
            </div>

            {/* Donation Toggle */}
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200/50">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={donationEnabled}
                  onChange={toggleDonation}
                  className="mt-0.5 w-4 h-4 text-rose-500 rounded border-slate-300 focus:ring-rose-500"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" /> Add ₹1 donation
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Support food recovery for communities in need
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-between font-bold text-base pt-3 border-t border-slate-200 mb-4">
              <span>Total</span>
              <span className="text-emerald-600">₹{total}</span>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
