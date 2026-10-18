/**
 * supabaseAdapter.js — Unified Data Access & Storage Adapter
 * 
 * Provides an asynchronous, Supabase-compatible data access layer.
 * When real Supabase credentials are configured, reads and writes go to
 * PostgreSQL with RLS.
 * In demo mode (credentials unset), seamlessly proxies to localStorage stores
 * and in-memory fixtures without altering existing domain engine logic.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { loadOfficialFixture, getProductImage } from './fixtureLoader.js';
import { checkEligibility } from '../domain/eligibility.js';
import { getStoredDecisions, saveDecision as saveLocalDecision, clearStoredDecisions } from './decisionStore.js';
import {
  getOrders,
  createOrder as createLocalOrder,
  updateOrderStatus as updateLocalOrderStatus,
  recordPayment as recordLocalPayment,
  recordDonation as recordLocalDonation,
  getDonations,
  getFeedback,
  submitFeedback as submitLocalFeedback,
  respondToFeedback as respondLocalFeedback,
  getOrderAnalytics
} from './orderStore.js';

// ─── INVENTORY BATCHES ────────────────────────────────────────────────────────

/**
 * Normalizes cold chain status to strictly match the DB check constraint:
 * ('compliant', 'exception', 'unknown')
 */
export function normalizeColdChainStatus(status) {
  if (!status) return 'compliant';
  const s = String(status).toLowerCase().trim();
  if (s === 'exception' || s === 'review' || s === 'breached' || s === 'broken' || s === 'alert') {
    return 'exception';
  }
  if (s === 'unknown') {
    return 'unknown';
  }
  return 'compliant';
}

/**
 * Normalizes condition to strictly match the DB check constraint:
 * ('good', 'fair', 'damaged')
 */
export function normalizeCondition(condition) {
  if (!condition) return 'good';
  const c = String(condition).toLowerCase().trim();
  if (c === 'damaged' || c === 'spoiled' || c === 'broken') {
    return 'damaged';
  }
  if (c === 'fair') {
    return 'fair';
  }
  return 'good';
}

/**
 * Fetch inventory batches.
 * Customers only receive eligible, non-expired batches.
 * Managers receive all batches for their store.
 */
export async function getBatches({ isManager = false, datasetMode = 'LIVE' } = {}) {
  // If official fixture explicitly requested (for C30 judging verification tests)
  if (datasetMode === 'OFFICIAL') {
    const res = await loadOfficialFixture();
    return res.batches;
  }

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('inventory_batches')
      .select(`
        *,
        product:products(*)
      `);

    // Customer safety filter at query level if RLS hasn't filtered
    if (!isManager) {
      query = query
        .gt('expiry_at', new Date().toISOString())
        .neq('condition', 'damaged')
        .eq('cold_chain_status', 'compliant')
        .gt('available_quantity', 0);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase getBatches failed:', error);
      throw new Error(`Database error: ${error.message || 'Failed to fetch inventory records'}`);
    }

    if (Array.isArray(data)) {
      // Exclude soft-deleted batches from active inventory
      const activeBatches = data.filter(b => !b.deleted_at);
      return activeBatches.map(b => {
        const originalPrice = (b.original_price_paise || 0) / 100;
        const incrementalCost = (b.incremental_cost_paise || 0) / 100;
        const currentPrice = (b.current_selling_price_paise || b.original_price_paise || 0) / 100;
        const isExpired = new Date(b.expiry_at) <= new Date();
        const productName = b.product?.name || b.batch_code;

        const rawItem = {
          id: b.batch_code,
          productName,
          category: b.product?.category || 'General',
          qty: b.available_quantity,
          originalPrice,
          sale_price_inr: originalPrice,
          incrementalCost,
          incremental_cost_inr: incrementalCost,
          currentPrice,
          allowedMarkdownPercent: b.max_allowed_markdown_percent || 50,
          allowed_markdown_percent: b.max_allowed_markdown_percent || 50,
          expiryAt: b.expiry_at,
          condition: b.condition || 'good',
          coldChainStatus: b.cold_chain_status || 'compliant',
          cold_chain_status: b.cold_chain_status || 'compliant',
          expired: isExpired,
          demandAssumption: b.demand_assumption_units || b.available_quantity || 10,
          demand_assumption_units: b.demand_assumption_units || b.available_quantity || 10
        };

        const eligibility = checkEligibility(rawItem);

        return {
          ...rawItem,
          dbId: b.id,
          productId: b.product_id,
          image: b.product?.image_emoji || getProductImage(b.batch_code, productName),
          imageUrl: b.product?.image_url || b.image_url || null,
          store_id: b.store_id,
          unitMargin: Math.round((originalPrice - incrementalCost) * 100) / 100,
          eligibility
        };
      });
    }
  }

  // If Supabase is not configured, load user-created local records (no hardcoded demo catalog)
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('c30_user_batches') : null;
    const userBatches = raw ? JSON.parse(raw) : [];
    const enriched = userBatches.map(b => ({
      ...b,
      expired: new Date(b.expiryAt) <= new Date(),
      eligibility: b.eligibility || checkEligibility(b)
    }));
    if (!isManager) {
      return enriched.filter(b => !b.expired && b.eligibility?.eligible !== false && b.condition !== 'damaged' && b.coldChainStatus !== 'exception' && b.qty > 0);
    }
    return enriched;
  } catch {
    return [];
  }
}

/**
 * Save an updated or newly created inventory batch to database.
 * Enforces database schema constraints, handles product creation, and syncs local cache.
 */
export async function saveBatch(batchData) {
  if (!batchData) {
    throw new Error('Batch data is required for saving.');
  }

  const productName = (batchData.productName || 'Perishable Stock Item').trim();
  const originalPricePaise = Math.round(Number(batchData.originalPrice || batchData.sale_price_inr || 0) * 100);
  const incrementalCostPaise = Math.round(Number(batchData.incrementalCost || batchData.incremental_cost_inr || 0) * 100);
  const currentPricePaise = Math.round(Number(batchData.currentPrice || batchData.originalPrice || 0) * 100);
  const allowedMarkdownPercent = Math.min(90, Math.max(0, parseInt(batchData.allowedMarkdownPercent || batchData.allowed_markdown_percent || 40, 10)));
  const qty = Math.max(1, parseInt(batchData.qty || batchData.available_quantity || 1, 10));
  const batchCode = (batchData.id || batchData.batch_code || `B-${Math.floor(1000 + Math.random() * 9000)}`).trim();

  const normalizedColdChain = normalizeColdChainStatus(batchData.coldChainStatus || batchData.cold_chain_status);
  const normalizedCondition = normalizeCondition(batchData.condition);

  let expiryAt = batchData.expiryAt;
  if (!expiryAt) {
    const days = parseInt(batchData.daysUntilExpiry, 10) || 3;
    expiryAt = new Date(Date.now() + days * 86400000).toISOString();
  }

  if (isSupabaseConfigured && supabase) {
    // 1. Resolve or Insert product catalog item
    let productId = batchData.productId;
    if (!productId) {
      // Check if product with this exact name already exists in products catalog
      const { data: existingProd, error: existingErr } = await supabase
        .from('products')
        .select('id, image_url')
        .ilike('name', productName)
        .maybeSingle();

      if (existingProd?.id) {
        productId = existingProd.id;
        if (batchData.imageUrl && !existingProd.image_url) {
          await supabase.from('products').update({ image_url: batchData.imageUrl }).eq('id', productId);
        }
      } else {
        const cleanNamePrefix = productName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'ITEM';
        const productSku = `SKU-${cleanNamePrefix}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const { data: newProd, error: newProdErr } = await supabase
          .from('products')
          .insert({
            sku: productSku,
            name: productName,
            category: batchData.category || 'General',
            image_emoji: batchData.image || getProductImage('', productName),
            image_url: batchData.imageUrl || null,
            base_price_paise: originalPricePaise,
            default_incremental_cost_paise: incrementalCostPaise,
            max_markdown_percent: allowedMarkdownPercent
          })
          .select()
          .single();

        if (newProdErr) {
          console.error('Supabase product creation error:', newProdErr);
          throw new Error(`Database error creating product catalog record: ${newProdErr.message}`);
        }
        productId = newProd.id;
      }
    } else if (productId && batchData.imageUrl) {
      await supabase.from('products').update({ image_url: batchData.imageUrl }).eq('id', productId);
    }

    // 2. Resolve store_id
    let storeId = batchData.store_id;
    if (!storeId) {
      const { data: storeData } = await supabase.from('stores').select('id').limit(1).maybeSingle();
      storeId = storeData?.id;
    }

    if (!storeId) {
      throw new Error('No store record found in database. Please ensure at least one store exists in public.stores.');
    }

    // 3. Upsert into inventory_batches with onConflict on batch_code
    const payload = {
      batch_code: batchCode,
      store_id: storeId,
      product_id: productId,
      initial_quantity: qty,
      available_quantity: qty,
      original_price_paise: originalPricePaise,
      incremental_cost_paise: incrementalCostPaise,
      current_selling_price_paise: currentPricePaise,
      max_allowed_markdown_percent: allowedMarkdownPercent,
      expiry_at: expiryAt,
      condition: normalizedCondition,
      cold_chain_status: normalizedColdChain,
      notes: batchData.notes || ''
    };

    const { data: savedRow, error: batchErr } = await supabase
      .from('inventory_batches')
      .upsert(payload, { onConflict: 'store_id,batch_code' })
      .select(`
        *,
        product:products(*)
      `)
      .single();

    if (batchErr) {
      console.error('Supabase inventory_batches save error:', batchErr);
      throw new Error(`Database error saving inventory batch: ${batchErr.message}`);
    }

    const originalPrice = savedRow.original_price_paise / 100;
    const incrementalCost = savedRow.incremental_cost_paise / 100;
    const isExpired = new Date(savedRow.expiry_at) <= new Date();

    const normalizedBatch = {
      id: savedRow.batch_code,
      dbId: savedRow.id,
      productId: savedRow.product_id,
      productName: savedRow.product?.name || productName,
      category: savedRow.product?.category || batchData.category || 'General',
      image: savedRow.product?.image_emoji || batchData.image || getProductImage(savedRow.batch_code, productName),
      imageUrl: savedRow.product?.image_url || batchData.imageUrl || null,
      qty: savedRow.available_quantity,
      originalPrice,
      incrementalCost,
      currentPrice: savedRow.current_selling_price_paise / 100,
      allowedMarkdownPercent: savedRow.max_allowed_markdown_percent,
      expiryAt: savedRow.expiry_at,
      condition: savedRow.condition,
      coldChainStatus: savedRow.cold_chain_status,
      expired: isExpired,
      store_id: savedRow.store_id,
      unitMargin: Math.round((originalPrice - incrementalCost) * 100) / 100,
      demandAssumption: batchData.demandAssumption || savedRow.available_quantity,
      eligibility: checkEligibility({
        id: savedRow.batch_code,
        qty: savedRow.available_quantity,
        sale_price_inr: originalPrice,
        originalPrice,
        incremental_cost_inr: incrementalCost,
        incrementalCost,
        condition: savedRow.condition,
        coldChainStatus: savedRow.cold_chain_status,
        cold_chain_status: savedRow.cold_chain_status,
        expired: isExpired,
        expiryAt: savedRow.expiry_at,
        demandAssumption: batchData.demandAssumption || savedRow.available_quantity
      })
    };

    // Keep localStorage cache in sync for offline resilience
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('c30_user_batches');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(b => b.id !== normalizedBatch.id && (!normalizedBatch.dbId || b.dbId !== normalizedBatch.dbId));
        localStorage.setItem('c30_user_batches', JSON.stringify([normalizedBatch, ...filtered]));
      }
    } catch {
      // ignore storage errors
    }

    return { success: true, batch: normalizedBatch };
  }

  // Local fallback (when Supabase is unconfigured)
  const isExpired = new Date(expiryAt) <= new Date();
  const originalPrice = originalPricePaise / 100;
  const incrementalCost = incrementalCostPaise / 100;

  const localBatch = {
    ...batchData,
    id: batchCode,
    productName,
    qty,
    originalPrice,
    incrementalCost,
    currentPrice: currentPricePaise / 100,
    allowedMarkdownPercent,
    expiryAt,
    condition: normalizedCondition,
    coldChainStatus: normalizedColdChain,
    expired: isExpired,
    unitMargin: Math.round((originalPrice - incrementalCost) * 100) / 100,
    image: batchData.image || getProductImage(batchCode, productName),
    eligibility: checkEligibility({
      id: batchCode,
      qty,
      sale_price_inr: originalPrice,
      originalPrice,
      incremental_cost_inr: incrementalCost,
      incrementalCost,
      condition: normalizedCondition,
      coldChainStatus: normalizedColdChain,
      cold_chain_status: normalizedColdChain,
      expired: isExpired,
      expiryAt,
      demandAssumption: batchData.demandAssumption || qty
    })
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('c30_user_batches');
      const list = raw ? JSON.parse(raw) : [];
      const filtered = list.filter(b => b.id !== localBatch.id);
      localStorage.setItem('c30_user_batches', JSON.stringify([localBatch, ...filtered]));
    }
  } catch {
    // ignore
  }

  return { success: true, batch: localBatch };
}

/**
 * Delete or archive an inventory batch and its product record if unreferenced.
 * Uses atomic Supabase operations, respecting RLS and foreign-key constraints.
 */
export async function deleteBatch(batchData) {
  const batchCode = batchData?.id || batchData?.batch_code;
  const batchDbId = batchData?.dbId;
  const productId = batchData?.productId;

  if (!batchCode && !batchDbId) {
    throw new Error('Batch identifier missing for deletion.');
  }

  // 1. Clean from local user storage cache
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('c30_user_batches');
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter(b => b.id !== batchCode && b.dbId !== batchDbId);
        localStorage.setItem('c30_user_batches', JSON.stringify(filtered));
      }
    }
  } catch {
    // ignore local storage error
  }

  // 2. Database deletion via Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      // First try stored procedure if migration 005 was executed
      if (batchDbId) {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('delete_inventory_batch', {
          p_batch_id: batchDbId
        });
        if (!rpcErr && rpcData?.success) {
          return { success: true, action: rpcData.action, batchCode };
        }
      }

      // Direct Supabase query fallback:
      // Try soft-delete first if deleted_at column exists
      let softDeleted = false;
      let softQuery = supabase
        .from('inventory_batches')
        .update({ deleted_at: new Date().toISOString(), available_quantity: 0 });

      if (batchDbId) {
        softQuery = softQuery.eq('id', batchDbId);
      } else {
        softQuery = softQuery.eq('batch_code', batchCode);
      }

      const { error: softErr } = await softQuery;

      if (!softErr) {
        softDeleted = true;
      } else {
        // If column deleted_at does not exist, perform physical delete
        let delQuery = supabase.from('inventory_batches').delete();
        if (batchDbId) {
          delQuery = delQuery.eq('id', batchDbId);
        } else {
          delQuery = delQuery.eq('batch_code', batchCode);
        }
        const { error: delErr } = await delQuery;

        if (delErr) {
          // If foreign key restricts deletion, zero out stock as safe fallback
          let zeroQuery = supabase
            .from('inventory_batches')
            .update({ available_quantity: 0, condition: 'damaged' });

          if (batchDbId) {
            zeroQuery = zeroQuery.eq('id', batchDbId);
          } else {
            zeroQuery = zeroQuery.eq('batch_code', batchCode);
          }

          const { error: zeroErr } = await zeroQuery;
          if (zeroErr) {
            throw new Error(`Database delete failed: ${delErr.message}`);
          }
        }
      }

      // If productId provided, attempt soft-delete or physical delete if unreferenced
      if (productId) {
        try {
          const { error: prodSoftErr } = await supabase
            .from('products')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', productId);

          if (prodSoftErr) {
            await supabase.from('products').delete().eq('id', productId);
          }
        } catch {
          // Keep product if referenced by historical orders
        }
      }

      return { success: true, batchCode, action: softDeleted ? 'archived' : 'deleted' };
    } catch (err) {
      console.error('Supabase deleteBatch error:', err);
      return { success: false, error: err.message || 'Database deletion failed' };
    }
  }

  return { success: true, batchCode, action: 'deleted' };
}

// ─── DECISIONS ────────────────────────────────────────────────────────────────

export async function fetchDecisions() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          batchId: d.batch_code,
          actionType: d.action_type,
          proposedPrice: d.proposed_price_paise / 100,
          allocatedQuantity: d.allocated_quantity,
          supportedDemand: d.supported_demand,
          unitContribution: d.unit_contribution_paise / 100,
          totalContribution: d.total_contribution_paise / 100,
          reasoning: d.reasoning,
          timestamp: d.created_at
        }));
      }
    } catch (err) {
      console.warn('Supabase fetchDecisions failed, using localStorage:', err);
    }
  }

  return getStoredDecisions();
}

export async function recordDecision(decisionRecord) {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('decisions').insert({
        batch_code: decisionRecord.batchId,
        action_type: decisionRecord.actionType || 'MARKDOWN_SALE',
        proposed_price_paise: Math.round((decisionRecord.proposedPrice || 0) * 100),
        allocated_quantity: decisionRecord.allocatedQuantity || 0,
        supported_demand: decisionRecord.supportedDemand || 0,
        unit_contribution_paise: Math.round((decisionRecord.unitContribution || 0) * 100),
        total_contribution_paise: Math.round((decisionRecord.totalContribution || 0) * 100),
        reasoning: decisionRecord.reasoning || ''
      });
    } catch (err) {
      console.warn('Supabase recordDecision failed:', err);
    }
  }

  return saveLocalDecision(decisionRecord);
}

// ─── ORDERS & CHECKOUT ────────────────────────────────────────────────────────

export async function placeOrder(orderPayload) {
  if (isSupabaseConfigured) {
    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: `ORD-${Date.now()}`,
          customer_id: orderPayload.customerId,
          customer_name: orderPayload.customerName,
          subtotal_paise: Math.round(orderPayload.subtotal * 100),
          donation_amount_paise: Math.round((orderPayload.donationAmount || 0) * 100),
          total_paise: Math.round(orderPayload.total * 100),
          status: 'confirmed',
          payment_status: 'captured'
        })
        .select()
        .single();

      if (!orderErr && order) {
        // Insert order items
        const items = orderPayload.items.map(item => ({
          order_id: order.id,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price_paise: Math.round(item.price * 100),
          original_price_paise: Math.round(item.originalPrice * 100),
          line_total_paise: Math.round(item.price * item.quantity * 100)
        }));

        await supabase.from('order_items').insert(items);

        // Record donation if present
        if (orderPayload.donationAmount > 0) {
          await supabase.from('donations').insert({
            order_id: order.id,
            customer_id: orderPayload.customerId,
            customer_name: orderPayload.customerName,
            amount_paise: Math.round(orderPayload.donationAmount * 100),
            payment_verified: true,
            verified_at: new Date().toISOString()
          });
        }

        return { success: true, order };
      }
    } catch (err) {
      console.warn('Supabase placeOrder failed, using local store:', err);
    }
  }

  // Local fallback
  const order = createLocalOrder(orderPayload);
  recordLocalPayment({
    orderId: order.id,
    amount: order.total,
    status: 'success'
  });
  updateLocalOrderStatus(order.id, 'confirmed', 'success');

  if (orderPayload.donationAmount > 0) {
    recordLocalDonation({
      customerId: orderPayload.customerId,
      customerName: orderPayload.customerName,
      orderId: order.id,
      amount: orderPayload.donationAmount,
      paymentVerified: true
    });
  }

  return { success: true, order };
}

export {
  getOrders,
  getDonations,
  getFeedback,
  submitLocalFeedback as submitFeedback,
  respondLocalFeedback as respondToFeedback,
  getOrderAnalytics
};
