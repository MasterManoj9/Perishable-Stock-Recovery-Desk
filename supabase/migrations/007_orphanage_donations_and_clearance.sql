-- ============================================================================
-- FYND x NMIMS Hyderabad — C30: Perishable Stock Recovery Desk
-- Migration 007: Orphanage Donations & Clearance Markdown Engine
--
-- 1. Creates public.orphanage_batch_donations to persist batch donations
--    to orphanages with location routing and estimated value tracking.
-- 2. Safely updates condition check constraint on inventory_batches to
--    support ('good', 'fair', 'damaged', 'donated').
-- 3. Stored Procedure public.donate_batch_to_orphanage() to atomically
--    record the donation and deduct stock from inventory_batches.
-- 4. Stored Procedure public.apply_clearance_discount() to update markdown
--    percent and current selling price in Supabase inventory.
-- 5. Stored Procedure public.get_orphanage_donation_metrics() to aggregate
--    customer ₹1 micro-donations and batch food valuation.
-- 6. Row-Level Security (RLS) policies and role permissions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ORPHANAGE BATCH DONATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orphanage_batch_donations (
    id TEXT PRIMARY KEY DEFAULT ('ORPH-DON-' || floor(extract(epoch from now()) * 1000)::text || '-' || substr(md5(random()::text), 1, 4)),
    batch_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    original_price_paise INTEGER NOT NULL DEFAULT 0 CHECK (original_price_paise >= 0),
    estimated_value_paise INTEGER NOT NULL DEFAULT 0 CHECK (estimated_value_paise >= 0),
    location TEXT NOT NULL DEFAULT 'General Area',
    orphanage_name TEXT NOT NULL DEFAULT 'Central Orphanage Food Recovery Hub',
    donated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orph_donations_batch ON public.orphanage_batch_donations (batch_id);
CREATE INDEX IF NOT EXISTS idx_orph_donations_location ON public.orphanage_batch_donations (location);
CREATE INDEX IF NOT EXISTS idx_orph_donations_donated_at ON public.orphanage_batch_donations (donated_at DESC);

-- ----------------------------------------------------------------------------
-- 2. UPDATE CONDITION CONSTRAINT ON INVENTORY BATCHES
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    ALTER TABLE public.inventory_batches 
    DROP CONSTRAINT IF EXISTS inventory_batches_condition_check;

    ALTER TABLE public.inventory_batches 
    ADD CONSTRAINT inventory_batches_condition_check 
    CHECK (condition IN ('good', 'fair', 'damaged', 'donated'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- 3. STORED PROCEDURE: DONATE BATCH TO ORPHANAGE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.donate_batch_to_orphanage(
    p_batch_code TEXT,
    p_quantity INTEGER,
    p_location TEXT DEFAULT 'General Area',
    p_orphanage_name TEXT DEFAULT 'Central Orphanage Food Recovery Hub'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch RECORD;
    v_deduct_qty INTEGER;
    v_remaining_qty INTEGER;
    v_estimated_value_paise INTEGER;
    v_donation_id TEXT;
BEGIN
    -- 1. Find target batch
    SELECT b.*, p.name AS resolved_product_name
    INTO v_batch
    FROM public.inventory_batches b
    LEFT JOIN public.products p ON b.product_id = p.id
    WHERE b.batch_code = TRIM(p_batch_code)
       OR b.id::text = TRIM(p_batch_code)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Batch not found for code: ' || p_batch_code
        );
    END IF;

    -- 2. Validate quantity
    v_deduct_qty := LEAST(GREATEST(1, p_quantity), v_batch.available_quantity);
    v_remaining_qty := GREATEST(0, v_batch.available_quantity - v_deduct_qty);
    v_estimated_value_paise := v_deduct_qty * COALESCE(v_batch.original_price_paise, 0);

    -- 3. Update inventory batch stock
    UPDATE public.inventory_batches
    SET available_quantity = v_remaining_qty,
        condition = CASE WHEN v_remaining_qty = 0 THEN 'donated' ELSE condition END,
        updated_at = now()
    WHERE id = v_batch.id;

    -- 4. Record the donation
    v_donation_id := 'ORPH-DON-' || floor(extract(epoch from now()) * 1000)::text || '-' || substr(md5(random()::text), 1, 4);

    INSERT INTO public.orphanage_batch_donations (
        id,
        batch_id,
        product_name,
        quantity,
        original_price_paise,
        estimated_value_paise,
        location,
        orphanage_name,
        donated_at
    ) VALUES (
        v_donation_id,
        COALESCE(v_batch.batch_code, v_batch.id::text),
        COALESCE(v_batch.resolved_product_name, v_batch.batch_code, 'Perishable Goods'),
        v_deduct_qty,
        COALESCE(v_batch.original_price_paise, 0),
        v_estimated_value_paise,
        COALESCE(p_location, 'General Area'),
        COALESCE(p_orphanage_name, 'Central Orphanage Food Recovery Hub'),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'donation_id', v_donation_id,
        'batch_code', v_batch.batch_code,
        'donated_quantity', v_deduct_qty,
        'remaining_quantity', v_remaining_qty,
        'estimated_value_inr', round(v_estimated_value_paise / 100.0, 2),
        'location', p_location,
        'orphanage_name', p_orphanage_name
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. STORED PROCEDURE: APPLY CLEARANCE DISCOUNT
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_clearance_discount(
    p_batch_code TEXT,
    p_discount_percent INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch RECORD;
    v_clamped_pct INTEGER;
    v_new_price_paise INTEGER;
BEGIN
    v_clamped_pct := GREATEST(5, LEAST(90, p_discount_percent));

    SELECT * INTO v_batch
    FROM public.inventory_batches
    WHERE batch_code = TRIM(p_batch_code)
       OR id::text = TRIM(p_batch_code)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Batch not found for code: ' || p_batch_code
        );
    END IF;

    -- Calculate clearance selling price
    v_new_price_paise := ROUND(v_batch.original_price_paise * (1.0 - (v_clamped_pct::numeric / 100.0)));

    UPDATE public.inventory_batches
    SET max_allowed_markdown_percent = v_clamped_pct,
        current_selling_price_paise = v_new_price_paise,
        updated_at = now()
    WHERE id = v_batch.id;

    RETURN jsonb_build_object(
        'success', true,
        'batch_code', v_batch.batch_code,
        'discount_percent', v_clamped_pct,
        'original_price_inr', round(v_batch.original_price_paise / 100.0, 2),
        'new_price_inr', round(v_new_price_paise / 100.0, 2)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. STORED PROCEDURE: AGGREGATE DONATION METRICS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_orphanage_donation_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rupee_one_count INTEGER := 0;
    v_rupee_one_total_paise BIGINT := 0;
    v_batches_count INTEGER := 0;
    v_units_count INTEGER := 0;
    v_batch_value_paise BIGINT := 0;
BEGIN
    -- Customer ₹1 donations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'donations') THEN
        SELECT 
            COUNT(*)::integer,
            COALESCE(SUM(amount_paise), 0)::bigint
        INTO v_rupee_one_count, v_rupee_one_total_paise
        FROM public.donations
        WHERE payment_verified = true;
    END IF;

    -- Orphanage batch donations
    SELECT 
        COUNT(*)::integer,
        COALESCE(SUM(quantity), 0)::integer,
        COALESCE(SUM(estimated_value_paise), 0)::bigint
    INTO v_batches_count, v_units_count, v_batch_value_paise
    FROM public.orphanage_batch_donations;

    RETURN jsonb_build_object(
        'rupee_one_donations_count', v_rupee_one_count,
        'rupee_one_total_inr', round(v_rupee_one_total_paise / 100.0, 2),
        'total_batches_donated', v_batches_count,
        'total_units_donated', v_units_count,
        'total_batch_value_inr', round(v_batch_value_paise / 100.0, 2),
        'grand_total_donated_inr', round((v_rupee_one_total_paise + v_batch_value_paise) / 100.0, 2)
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & GRANTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.orphanage_batch_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to orphanage donations" ON public.orphanage_batch_donations;
CREATE POLICY "Allow read access to orphanage donations"
ON public.orphanage_batch_donations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow insert access to orphanage donations" ON public.orphanage_batch_donations;
CREATE POLICY "Allow insert access to orphanage donations"
ON public.orphanage_batch_donations FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access to orphanage donations" ON public.orphanage_batch_donations;
CREATE POLICY "Allow update access to orphanage donations"
ON public.orphanage_batch_donations FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permissions
GRANT ALL ON TABLE public.orphanage_batch_donations TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.donate_batch_to_orphanage(TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_clearance_discount(TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_orphanage_donation_metrics() TO anon, authenticated, service_role;
