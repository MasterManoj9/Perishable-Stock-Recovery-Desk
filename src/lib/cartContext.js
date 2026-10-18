/**
 * cartContext.js — Shopping Cart State Management
 * 
 * Provides cart state for customers. Cart is stored in localStorage
 * and synced to Supabase when available.
 * 
 * Enforces:
 * - Quantity cannot exceed available stock
 * - Expired/blocked items cannot be added
 * - Donation is a separate ₹1 line item
 * - Prices come from the product catalog (not editable by customer)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'c30_shopping_cart';
const DONATION_AMOUNT = 1; // ₹1

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : { items: [], donationEnabled: false };
  } catch {
    return { items: [], donationEnabled: false };
  }
}

function persistCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [donationEnabled, setDonationEnabled] = useState(false);

  useEffect(() => {
    const saved = loadCart();
    setItems(saved.items || []);
    setDonationEnabled(saved.donationEnabled || false);
  }, []);

  useEffect(() => {
    persistCart({ items, donationEnabled });
  }, [items, donationEnabled]);

  const addItem = useCallback((product, quantity = 1) => {
    if (!product) {
      return { success: false, error: 'Invalid product record' };
    }

    if (product.coldChainStatus === 'exception' || product.cold_chain_status === 'exception') {
      return {
        success: false,
        error: 'Sale blocked: unresolved cold-chain exception. A valid expiry date does not establish product safety.'
      };
    }

    if (product.condition === 'damaged') {
      return { success: false, error: 'Product is damaged and blocked from sale under safety rules.' };
    }

    if (product.expired === true || (product.expiryAt && new Date(product.expiryAt) <= new Date())) {
      return { success: false, error: 'Product has expired and is not saleable.' };
    }

    if (product.eligibility?.eligible === false) {
      return { success: false, error: product.eligibility?.reason || 'This product is not available for purchase.' };
    }

    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      const maxQty = product.qty || product.quantity_available || 0;
      
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, maxQty);
        return prev.map(i => 
          i.productId === product.id ? { ...i, quantity: newQty } : i
        );
      }

      const price = product.discountedPrice || product.originalPrice || product.base_price || 0;
      const originalPrice = product.originalPrice || product.base_price || price;
      const discount = originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;

      return [...prev, {
        productId: product.id,
        productName: product.productName || product.name,
        image: product.image || '📦',
        category: product.category || 'General',
        price,
        originalPrice,
        discount,
        quantity: Math.min(quantity, maxQty),
        maxQuantity: maxQty,
        expiryAt: product.expiryAt || null,
        expiryDisplay: product.expiryDisplay || '',
        storeId: product.store_id || null
      }];
    });

    return { success: true };
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setItems(prev => prev.map(i => 
      i.productId === productId 
        ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } 
        : i
    ));
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDonationEnabled(false);
  }, []);

  const toggleDonation = useCallback(() => {
    setDonationEnabled(prev => !prev);
  }, []);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = items.reduce((sum, item) => sum + ((item.originalPrice - item.price) * item.quantity), 0);
  const donationAmount = donationEnabled ? DONATION_AMOUNT : 0;
  const total = subtotal + donationAmount;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    items,
    itemCount,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    donationEnabled,
    donationAmount,
    total: Math.round(total * 100) / 100,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    toggleDonation
  };

  return React.createElement(CartContext.Provider, { value }, children);
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
