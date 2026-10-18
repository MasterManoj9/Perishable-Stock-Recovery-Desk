-- ============================================================================
-- FYND x NMIMS Hyderabad — C30: Perishable Stock Recovery Desk
-- COMBINED MASTER DATABASE SETUP (Run this in Supabase SQL Editor)
--
-- This script contains:
-- Part 1: Relational Database Schema (12 tables with integer paise)
-- Part 2: Row Level Security (RLS) & Food Safety Access Control
-- Part 3: Seed Data (Stores, Products, and Fixtures B1, B2, B3, B4)
-- ============================================================================

-- ============================================================================
-- PART 1: RELATIONAL DATABASE SCHEMA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean drop any stale trigger or tables from previous templates
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DROP TABLE IF EXISTS public.decisions CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.inventory_batches CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;

-- 1. STORES TABLE
CREATE TABLE public.stores (
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

-- 2. USER PROFILES TABLE (supports both id and user_id for full compatibility)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'manager', 'admin')),
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PRODUCTS MASTER CATALOG
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

-- 4. INVENTORY BATCHES TABLE (Primary Perishable Unit of Tracking)
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

CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.inventory_batches (expiry_at);
CREATE INDEX IF NOT EXISTS idx_batches_store ON public.inventory_batches (store_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON public.inventory_batches (product_id);

-- 5. ORDERS TABLE
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

-- 6. ORDER ITEMS TABLE
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

-- 7. PAYMENTS TABLE
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

-- 8. DONATIONS TABLE (₹1 Community Food Recovery)
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

-- 9. NOTIFICATIONS TABLE
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

-- 10. CUSTOMER FEEDBACK TABLE
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

-- 11. INVENTORY MOVEMENTS AUDIT LOG
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

-- 12. MANAGER DECISIONS LOG
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

-- ============================================================================
-- PART 2: ROW LEVEL SECURITY & FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_manager());
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_select_policy" ON public.stores FOR SELECT USING (true);
CREATE POLICY "stores_modify_policy" ON public.stores FOR ALL USING (public.is_manager());

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_policy" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_modify_policy" ON public.products FOR ALL USING (public.is_manager());

-- INVENTORY BATCHES (FOOD SAFETY GATE)
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches_select_policy" ON public.inventory_batches FOR SELECT USING (
    public.is_manager() OR (
        expiry_at > now()
        AND condition != 'damaged'
        AND cold_chain_status = 'compliant'
        AND available_quantity > 0
    )
);
CREATE POLICY "batches_insert_policy" ON public.inventory_batches FOR INSERT WITH CHECK (public.is_manager());
CREATE POLICY "batches_update_policy" ON public.inventory_batches FOR UPDATE USING (public.is_manager());
CREATE POLICY "batches_delete_policy" ON public.inventory_batches FOR DELETE USING (public.is_manager());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_policy" ON public.orders FOR SELECT USING (customer_id = auth.uid() OR public.is_manager());
CREATE POLICY "orders_insert_policy" ON public.orders FOR INSERT WITH CHECK (customer_id = auth.uid() OR auth.uid() IS NULL);
CREATE POLICY "orders_update_policy" ON public.orders FOR UPDATE USING (customer_id = auth.uid() OR public.is_manager());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_policy" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = public.order_items.order_id AND (o.customer_id = auth.uid() OR public.is_manager()))
);
CREATE POLICY "order_items_insert_policy" ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = public.order_items.order_id AND (o.customer_id = auth.uid() OR auth.uid() IS NULL))
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select_policy" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = public.payments.order_id AND (o.customer_id = auth.uid() OR public.is_manager()))
);
CREATE POLICY "payments_insert_policy" ON public.payments FOR INSERT WITH CHECK (true);

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donations_select_policy" ON public.donations FOR SELECT USING (customer_id = auth.uid() OR public.is_manager());
CREATE POLICY "donations_insert_policy" ON public.donations FOR INSERT WITH CHECK (customer_id = auth.uid() OR auth.uid() IS NULL);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT WITH CHECK (public.is_manager() OR user_id = auth.uid());

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select_policy" ON public.feedback FOR SELECT USING (customer_id = auth.uid() OR public.is_manager());
CREATE POLICY "feedback_insert_policy" ON public.feedback FOR INSERT WITH CHECK (customer_id = auth.uid() OR auth.uid() IS NULL);
CREATE POLICY "feedback_update_policy" ON public.feedback FOR UPDATE USING (public.is_manager());

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements_manager_policy" ON public.inventory_movements FOR ALL USING (public.is_manager());

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions_manager_policy" ON public.decisions FOR ALL USING (public.is_manager());

-- ============================================================================
-- PART 3: SEED DATA
-- ============================================================================

-- 1. Demo Store
INSERT INTO public.stores (id, code, name, address, city, state, postal_code, min_contribution_floor_paise)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'HYD-BH-01',
    'Fynd Fresh — Banjara Hills',
    'Road No. 12, Banjara Hills',
    'Hyderabad',
    'Telangana',
    '500034',
    500
) ON CONFLICT (code) DO NOTHING;

-- 2. Products Catalog
INSERT INTO public.products (id, sku, name, category, image_emoji, base_price_paise, default_incremental_cost_paise, max_markdown_percent, is_perishable, shelf_life_hours)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'OGY-200', 'Organic Greek Yogurt 200g', 'Dairy', '🥣', 6000, 2500, 50, true, 48),
    ('b0000000-0000-0000-0000-000000000002', 'CAM-500', 'Cold-Pressed Almond Milk 500ml', 'Beverages', '🥛', 9000, 4000, 50, true, 24),
    ('b0000000-0000-0000-0000-000000000003', 'ASD-400', 'Artisan Sourdough Loaf', 'Bakery', '🍞', 12000, 4500, 50, true, 36),
    ('b0000000-0000-0000-0000-000000000004', 'STR-250', 'Fresh Mahabaleshwar Strawberries 250g', 'Produce', '🍓', 15000, 6000, 60, true, 24),
    ('b0000000-0000-0000-0000-000000000005', 'PAN-200', 'Farm Malai Paneer 200g', 'Dairy', '🧀', 11000, 5000, 40, true, 48),
    ('b0000000-0000-0000-0000-000000000006', 'CBR-300', 'Nitro Cold Brew Coffee 300ml', 'Beverages', '☕', 14000, 5500, 50, true, 72),
    ('b0000000-0000-0000-0000-000000000007', 'AVO-002', 'Hass Avocado (Pack of 2)', 'Produce', '🥑', 18000, 8000, 50, true, 48),
    ('b0000000-0000-0000-0000-000000000008', 'CRO-002', 'Butter Croissant (Pack of 2)', 'Bakery', '🥐', 13000, 4800, 50, true, 24)
ON CONFLICT (sku) DO NOTHING;

-- 3. Inventory Batches (Including Mandatory C30 Test Fixtures B1 & B2)
INSERT INTO public.inventory_batches (
    id, batch_code, store_id, product_id, initial_quantity, available_quantity, allocated_quantity,
    original_price_paise, incremental_cost_paise, current_selling_price_paise, max_allowed_markdown_percent,
    expiry_at, condition, cold_chain_status, notes
)
VALUES
    -- Mandatory Fixture B1 (Sellable & Eligible: 10 units, ₹60 original, ₹25 cost)
    (
        'c0000000-0000-0000-0000-000000000001',
        'B1',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        10, 10, 0,
        6000, 2500, 6000, 50,
        now() + interval '18 hours',
        'good', 'compliant',
        'C30 Official Fixture Batch 1: Compliant, near-expiry afternoon markdown candidate.'
    ),
    -- Mandatory Fixture B2 (Expired & Blocked: 8 units, ₹90 original, ₹40 cost)
    (
        'c0000000-0000-0000-0000-000000000002',
        'B2',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        8, 8, 0,
        9000, 4000, 9000, 50,
        now() - interval '4 hours',
        'good', 'compliant',
        'C30 Official Fixture Batch 2: Expired batch. Hard-blocked by safety gate.'
    ),
    -- Batch B3 (Damaged: Hard-blocked by safety gate)
    (
        'c0000000-0000-0000-0000-000000000003',
        'B3',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000003',
        6, 6, 0,
        12000, 4500, 12000, 50,
        now() + interval '12 hours',
        'damaged', 'compliant',
        'Crushed packaging during unloading. Blocked from customer sale.'
    ),
    -- Batch B4 (Cold-chain Exception: Blocked from sale until resolved)
    (
        'c0000000-0000-0000-0000-000000000004',
        'B4',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000005',
        12, 12, 0,
        11000, 5000, 11000, 40,
        now() + interval '24 hours',
        'good', 'exception',
        'Chiller temperature spike flagged by sensor. Under safety quarantine.'
    )
ON CONFLICT (store_id, batch_code) DO NOTHING;

-- ============================================================================
-- PART 4: PROVISION DEVELOPMENT TEST ACCOUNTS DIRECTLY IN SUPABASE AUTH
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up any existing instances of the test emails so fresh IDs and confirmed flags can be inserted cleanly
DELETE FROM auth.users WHERE email IN ('manager@fynd.com', 'customer@fynd.com');

-- 1. Insert Manager & Customer into auth.users with pre-confirmed email & bcrypt password
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_sso_user,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'manager@fynd.com',
    crypt('Manager@Password123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Store Manager","role":"manager"}'::jsonb,
    now(),
    now()
),
(
    '00000000-0000-0000-0000-000000000000',
    'b2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'customer@fynd.com',
    crypt('Customer@Password123!', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Demo Customer","role":"customer"}'::jsonb,
    now(),
    now()
);

-- 2. Provision Public Profiles for both test accounts
INSERT INTO public.profiles (id, user_id, email, full_name, phone, role)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'manager@fynd.com', 'Store Manager', '+91-9876543210', 'manager'),
    ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'customer@fynd.com', 'Demo Customer', '+91-9876543211', 'customer')
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    user_id = EXCLUDED.user_id;


