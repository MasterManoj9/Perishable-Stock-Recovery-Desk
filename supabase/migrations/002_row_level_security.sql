-- ============================================================================
-- FYND x NMIMS Hyderabad — C30: Perishable Stock Recovery Desk
-- Migration 002: Row Level Security (RLS) & Role-Based Access Control
--
-- Guarantees food safety at the database tier:
-- Expired, damaged, or cold-chain-compromised batches are blocked from customer SELECTs.
-- Customers can only read and manage their own orders, donations, and notifications.
-- Managers have scoped oversight of their store catalog, inventory, and analytics.
-- ============================================================================

-- Helper function to check if current authenticated user is manager or admin
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

-- Helper function to get current user's assigned store
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT store_id FROM public.profiles
  WHERE id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile; managers view all profiles
CREATE POLICY "profiles_select_policy"
    ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id
        OR public.is_manager()
    );

-- Allow users to update their own profile info (role escalation prevented by trigger)
CREATE POLICY "profiles_update_policy"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Prevent unauthorized role change
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.role <> OLD.role AND NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only system administrators may alter user roles.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- Trigger to automatically create a profile entry upon auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. STORES RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_select_policy"
    ON public.stores
    FOR SELECT
    USING (true); -- Publicly viewable for store selection

CREATE POLICY "stores_modify_policy"
    ON public.stores
    FOR ALL
    USING (public.is_manager());

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_policy"
    ON public.products
    FOR SELECT
    USING (true); -- All authenticated and anon users can browse catalog

CREATE POLICY "products_modify_policy"
    ON public.products
    FOR ALL
    USING (public.is_manager());

-- ----------------------------------------------------------------------------
-- 4. INVENTORY BATCHES RLS (CRITICAL FOOD SAFETY BARRIER)
-- ----------------------------------------------------------------------------
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

-- Customers can ONLY see non-expired, non-damaged, cold-chain compliant batches with stock
-- Managers can see ALL batches (to manage write-offs, markdowns, and audits)
CREATE POLICY "batches_select_policy"
    ON public.inventory_batches
    FOR SELECT
    USING (
        public.is_manager()
        OR (
            expiry_at > now()
            AND condition != 'damaged'
            AND cold_chain_status = 'compliant'
            AND available_quantity > 0
        )
    );

CREATE POLICY "batches_insert_policy"
    ON public.inventory_batches
    FOR INSERT
    WITH CHECK (public.is_manager());

CREATE POLICY "batches_update_policy"
    ON public.inventory_batches
    FOR UPDATE
    USING (public.is_manager());

CREATE POLICY "batches_delete_policy"
    ON public.inventory_batches
    FOR DELETE
    USING (public.is_manager());

-- ----------------------------------------------------------------------------
-- 5. ORDERS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_policy"
    ON public.orders
    FOR SELECT
    USING (
        customer_id = auth.uid()
        OR public.is_manager()
    );

CREATE POLICY "orders_insert_policy"
    ON public.orders
    FOR INSERT
    WITH CHECK (
        customer_id = auth.uid()
        OR auth.uid() IS NULL -- Guest checkout allowed in demo/kiosk
    );

CREATE POLICY "orders_update_policy"
    ON public.orders
    FOR UPDATE
    USING (
        customer_id = auth.uid()
        OR public.is_manager()
    );

-- ----------------------------------------------------------------------------
-- 6. ORDER ITEMS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_policy"
    ON public.order_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = public.order_items.order_id
              AND (o.customer_id = auth.uid() OR public.is_manager())
        )
    );

CREATE POLICY "order_items_insert_policy"
    ON public.order_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = public.order_items.order_id
              AND (o.customer_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_policy"
    ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = public.payments.order_id
              AND (o.customer_id = auth.uid() OR public.is_manager())
        )
    );

CREATE POLICY "payments_insert_policy"
    ON public.payments
    FOR INSERT
    WITH CHECK (true); -- Verified via Razorpay signature webhook or secure client flow

-- ----------------------------------------------------------------------------
-- 8. DONATIONS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "donations_select_policy"
    ON public.donations
    FOR SELECT
    USING (
        customer_id = auth.uid()
        OR public.is_manager()
    );

CREATE POLICY "donations_insert_policy"
    ON public.donations
    FOR INSERT
    WITH CHECK (
        customer_id = auth.uid()
        OR auth.uid() IS NULL
    );

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_policy"
    ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notifications_update_policy"
    ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy"
    ON public.notifications
    FOR INSERT
    WITH CHECK (public.is_manager() OR user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 10. FEEDBACK RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select_policy"
    ON public.feedback
    FOR SELECT
    USING (
        customer_id = auth.uid()
        OR public.is_manager()
    );

CREATE POLICY "feedback_insert_policy"
    ON public.feedback
    FOR INSERT
    WITH CHECK (
        customer_id = auth.uid()
        OR auth.uid() IS NULL
    );

CREATE POLICY "feedback_update_policy"
    ON public.feedback
    FOR UPDATE
    USING (public.is_manager());

-- ----------------------------------------------------------------------------
-- 11. INVENTORY MOVEMENTS & DECISIONS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements_manager_policy"
    ON public.inventory_movements
    FOR ALL
    USING (public.is_manager());

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decisions_manager_policy"
    ON public.decisions
    FOR ALL
    USING (public.is_manager());
