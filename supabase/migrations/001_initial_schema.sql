-- ============================================================================
-- FYND x NMIMS Hyderabad — C30: Perishable Stock Recovery Desk
-- Migration 001: Initial Relational Database Schema
--
-- All monetary fields are strictly stored in integer paise (1 INR = 100 paise)
-- to prevent IEEE 754 floating point precision errors.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. STORES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT NOT NULL DEFAULT 'Hyderabad',
    state TEXT NOT NULL DEFAULT 'Telangana',
    postal_code TEXT DEFAULT '500032',
    phone TEXT,
    min_contribution_floor_paise INTEGER NOT NULL DEFAULT 500, -- ₹5.00 min floor
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. USER PROFILES TABLE (Extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'manager', 'admin')),
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS MASTER CATALOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    image_emoji TEXT DEFAULT '📦',
    image_url TEXT,
    base_price_paise INTEGER NOT NULL CHECK (base_price_paise >= 0),
    default_incremental_cost_paise INTEGER NOT NULL CHECK (default_incremental_cost_paise >= 0),
    max_markdown_percent INTEGER NOT NULL DEFAULT 50 CHECK (max_markdown_percent BETWEEN 0 AND 90),
    is_perishable BOOLEAN NOT NULL DEFAULT true,
    shelf_life_hours INTEGER DEFAULT 48,
    unit_of_measure TEXT NOT NULL DEFAULT 'unit',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. INVENTORY BATCHES TABLE (Primary Perishable Unit of Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code TEXT NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
    available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
    allocated_quantity INTEGER NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0),
    original_price_paise INTEGER NOT NULL CHECK (original_price_paise >= 0),
    incremental_cost_paise INTEGER NOT NULL CHECK (incremental_cost_paise >= 0),
    current_selling_price_paise INTEGER NOT NULL CHECK (current_selling_price_paise >= 0),
    max_allowed_markdown_percent INTEGER NOT NULL DEFAULT 50 CHECK (max_allowed_markdown_percent BETWEEN 0 AND 90),
    expiry_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'fair', 'damaged')),
    cold_chain_status TEXT NOT NULL DEFAULT 'compliant' CHECK (cold_chain_status IN ('compliant', 'exception', 'unknown')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_batch UNIQUE (store_id, batch_code),
    CONSTRAINT chk_allocated_lte_available CHECK (allocated_quantity <= available_quantity)
);

-- Index for speedy inventory querying & expiry filtering
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.inventory_batches (expiry_at);
CREATE INDEX IF NOT EXISTS idx_batches_store ON public.inventory_batches (store_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON public.inventory_batches (product_id);

-- ----------------------------------------------------------------------------
-- 5. ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'ready_for_pickup', 'completed', 'cancelled')),
    subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
    discount_paise INTEGER NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
    donation_amount_paise INTEGER NOT NULL DEFAULT 0 CHECK (donation_amount_paise >= 0),
    total_paise INTEGER NOT NULL CHECK (total_paise >= 0),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
    payment_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. ORDER ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
    original_price_paise INTEGER NOT NULL CHECK (original_price_paise >= 0),
    discount_percent INTEGER NOT NULL DEFAULT 0,
    line_total_paise INTEGER NOT NULL CHECK (line_total_paise >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    gateway_order_id TEXT,
    gateway_payment_id TEXT UNIQUE,
    gateway_signature TEXT,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    verified_at TIMESTAMPTZ,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments (order_id);

-- ----------------------------------------------------------------------------
-- 8. DONATIONS TABLE (₹1 Community Food Recovery)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    amount_paise INTEGER NOT NULL DEFAULT 100 CHECK (amount_paise > 0), -- ₹1.00 = 100 paise
    program_name TEXT NOT NULL DEFAULT 'Near-Expiry Food Recovery Initiative',
    partner_ngo TEXT DEFAULT 'Akshaya Patra Foundation',
    payment_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_order ON public.donations (order_id);

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'order', 'donation', 'alert', 'feedback', 'inventory')),
    related_entity_type TEXT,
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read);

-- ----------------------------------------------------------------------------
-- 10. CUSTOMER FEEDBACK TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('product_quality', 'pricing', 'delivery', 'app_experience', 'customer_service', 'general')),
    message TEXT NOT NULL CHECK (char_length(trim(message)) >= 5),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'resolved')),
    manager_response TEXT,
    responded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_store ON public.feedback (store_id);
CREATE INDEX IF NOT EXISTS idx_feedback_customer ON public.feedback (customer_id);

-- ----------------------------------------------------------------------------
-- 11. INVENTORY MOVEMENTS AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'sale', 'markdown', 'write_off', 'donation', 'audit_correction')),
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    price_paise INTEGER,
    reason TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movements_batch ON public.inventory_movements (batch_id);

-- ----------------------------------------------------------------------------
-- 12. MANAGER DECISIONS LOG (Preserves existing Decision Engine history)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    batch_code TEXT NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('MARKDOWN_SALE', 'DONATE', 'DISCARD', 'MAINTAIN_PRICE')),
    proposed_price_paise INTEGER NOT NULL,
    allocated_quantity INTEGER NOT NULL,
    supported_demand INTEGER NOT NULL,
    unit_contribution_paise INTEGER NOT NULL,
    total_contribution_paise INTEGER NOT NULL,
    reasoning TEXT,
    compliance_checked BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_batch ON public.decisions (batch_code);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON public.decisions (created_at DESC);
