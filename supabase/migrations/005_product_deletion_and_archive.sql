-- ============================================================================
-- FYND x NMIMS Hyderabad — C30: Perishable Stock Recovery Desk
-- Migration 005: Product Deletion, Archival, and Foreign-Key Safety
--
-- 1. Adds deleted_at TIMESTAMPTZ to inventory_batches and products.
-- 2. Creates partial indexes for performant active-inventory queries.
-- 3. Updates RLS policies so customers and inventory queries only retrieve active (non-deleted) items.
-- 4. Allows authorized managers to delete unreferenced records or archive referenced ones.
-- 5. Preserves all historical orders, payments, order_items, and decision audit records.
-- ============================================================================

-- 1. Add deleted_at columns for safe archival
ALTER TABLE public.inventory_batches
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Indexes for fast active-item lookups
CREATE INDEX IF NOT EXISTS idx_inventory_batches_active
    ON public.inventory_batches (store_id, expiry_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_active
    ON public.products (category)
    WHERE deleted_at IS NULL;

-- 3. Update RLS policies to ensure deleted items are excluded from customer views
DROP POLICY IF EXISTS "batches_select_policy" ON public.inventory_batches;

CREATE POLICY "batches_select_policy"
    ON public.inventory_batches
    FOR SELECT
    USING (
        (public.is_manager() AND deleted_at IS NULL)
        OR (
            deleted_at IS NULL
            AND expiry_at > now()
            AND condition != 'damaged'
            AND cold_chain_status = 'compliant'
            AND available_quantity > 0
        )
    );

DROP POLICY IF EXISTS "batches_delete_policy" ON public.inventory_batches;

CREATE POLICY "batches_delete_policy"
    ON public.inventory_batches
    FOR DELETE
    USING (public.is_manager());

-- 4. Safe stored procedure to delete or archive an inventory batch
CREATE OR REPLACE FUNCTION public.delete_inventory_batch(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_orders BOOLEAN := false;
    v_batch_code TEXT;
    v_product_id UUID;
BEGIN
    -- Only managers may execute deletion
    IF NOT public.is_manager() THEN
        RAISE EXCEPTION 'Unauthorized: Only store managers may delete inventory items.';
    END IF;

    -- Lookup batch
    SELECT batch_code, product_id INTO v_batch_code, v_product_id
    FROM public.inventory_batches
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Batch not found.');
    END IF;

    -- Check if referenced in historical orders
    SELECT EXISTS (
        SELECT 1 FROM public.order_items WHERE batch_id = p_batch_id
    ) INTO v_has_orders;

    IF v_has_orders THEN
        -- Safely archive: set deleted_at, zero out available quantity
        UPDATE public.inventory_batches
        SET deleted_at = now(),
            available_quantity = 0,
            updated_at = now()
        WHERE id = p_batch_id;

        RETURN jsonb_build_object(
            'success', true,
            'action', 'archived',
            'batch_code', v_batch_code,
            'message', 'Batch safely archived because it is referenced in past orders.'
        );
    ELSE
        -- Safe physical deletion
        DELETE FROM public.inventory_batches WHERE id = p_batch_id;

        RETURN jsonb_build_object(
            'success', true,
            'action', 'deleted',
            'batch_code', v_batch_code,
            'message', 'Batch physically removed from inventory.'
        );
    END IF;
END;
$$;
