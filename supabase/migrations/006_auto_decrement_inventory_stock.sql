-- ============================================================================
-- FYND x NMIMS Hyderabad — C30: Perishable Stock Recovery Desk
-- Migration 006: Automatic Stock Deduction on Order Placement
--
-- 1. Creates an automated trigger on public.order_items that decrements
--    available_quantity in public.inventory_batches whenever an order is placed.
-- 2. Decrements stock safely to a minimum of 0 (never negative).
-- 3. Provides stored procedures for direct manual stock deduction by batch_code or id.
-- ============================================================================

-- 1. Automated Trigger Function to decrement inventory_batches stock
CREATE OR REPLACE FUNCTION public.trg_decrement_inventory_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_batch_id UUID := NEW.batch_id;
BEGIN
    -- If batch_id was not explicitly specified, resolve from product_id or product_name
    IF v_target_batch_id IS NULL AND NEW.product_id IS NOT NULL THEN
        SELECT id INTO v_target_batch_id
        FROM public.inventory_batches
        WHERE product_id = NEW.product_id
          AND available_quantity > 0
          AND (deleted_at IS NULL)
        ORDER BY expiry_at ASC
        LIMIT 1;
    END IF;

    IF v_target_batch_id IS NULL AND NEW.product_name IS NOT NULL THEN
        SELECT b.id INTO v_target_batch_id
        FROM public.inventory_batches b
        JOIN public.products p ON b.product_id = p.id
        WHERE p.name ILIKE TRIM(NEW.product_name)
          AND b.available_quantity > 0
          AND (b.deleted_at IS NULL)
        ORDER BY b.expiry_at ASC
        LIMIT 1;
    END IF;

    -- Decrement the available quantity on the matched batch
    IF v_target_batch_id IS NOT NULL THEN
        UPDATE public.inventory_batches
        SET available_quantity = GREATEST(0, available_quantity - NEW.quantity),
            updated_at = now()
        WHERE id = v_target_batch_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Attach Trigger to order_items table
DROP TRIGGER IF EXISTS trg_order_items_stock_deduct ON public.order_items;

CREATE TRIGGER trg_order_items_stock_deduct
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_decrement_inventory_stock();

-- 3. Convenience Function: Direct deduction by batch_code (e.g. Bread, B-1234)
CREATE OR REPLACE FUNCTION public.decrement_stock_by_code(p_batch_code TEXT, p_quantity INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_qty INTEGER;
BEGIN
    UPDATE public.inventory_batches
    SET available_quantity = GREATEST(0, available_quantity - p_quantity),
        updated_at = now()
    WHERE batch_code = TRIM(p_batch_code)
    RETURNING available_quantity INTO v_updated_qty;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'batch_code', p_batch_code, 'remaining_quantity', v_updated_qty);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Batch code not found');
    END IF;
END;
$$;
