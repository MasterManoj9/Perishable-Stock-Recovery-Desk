# Security Model & Row Level Security (RLS) Specification

## 1. Security Architecture Overview

The **Perishable Stock Recovery Desk** enforces defense-in-depth across three tiers:
1. **Frontend / UI Layer:** Dynamic UI toggles, input sanitization, disabled buttons for expired stock.
2. **Domain Business Logic Engine:** Pure JavaScript functions (`validation.js`, `eligibility.js`, `economics.js`) enforcing business rules and case checks.
3. **Database & RLS Tier:** PostgreSQL Row Level Security (RLS) ensuring that unauthorized or unsafe records can never be fetched or modified via Supabase client APIs.

---

## 2. Food Safety Database Hard-Stop Barrier

In a perishable food recovery platform, software bugs in the client must **never** result in spoiled food being displayed or sold to customers.

In [`supabase/migrations/002_row_level_security.sql`](file:///f:/FYND%20X%20GENESIS/supabase/migrations/002_row_level_security.sql), the RLS policy on `public.inventory_batches` implements this hard-stop:

```sql
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
```

### Safety Policy Guarantees:
- **Expired Stock (Case Check 2):** Any batch where `expiry_at <= now()` evaluates to `FALSE` for customer queries. Expired products literally do not exist in the customer's dataset.
- **Physical Damage:** Batches marked `'damaged'` are completely omitted from customer visibility.
- **Cold-Chain Exceptions:** Any batch with `'exception'` or `'unknown'` cold-chain sensor status is blocked until cleared by a store manager.
- **Out of Stock:** Items with `available_quantity <= 0` are excluded from customer views.

---

## 3. RLS Matrix by Entity and Role

| Table | Anonymous / Public | Customer Role | Store Manager Role | Admin Role |
|---|---|---|---|---|
| `stores` | SELECT only | SELECT only | SELECT, UPDATE | ALL |
| `profiles` | None | SELECT own, UPDATE own (non-role) | SELECT all store staff | ALL |
| `products` | SELECT only | SELECT only | ALL | ALL |
| `inventory_batches` | None | SELECT (safe & eligible only) | ALL | ALL |
| `orders` | None | SELECT own, INSERT own | SELECT all store orders, UPDATE status | ALL |
| `order_items` | None | SELECT own order items, INSERT | SELECT all store order items | ALL |
| `payments` | None | SELECT own order payments | SELECT all store payments | ALL |
| `donations` | None | SELECT own, INSERT with order | SELECT all donations for analytics | ALL |
| `notifications` | None | SELECT own, UPDATE own (`is_read`) | SELECT own, INSERT alerts | ALL |
| `feedback` | None | SELECT own, INSERT | SELECT all store feedback, UPDATE response | ALL |
| `inventory_movements`| None | None | SELECT, INSERT | ALL |
| `decisions` | None | None | SELECT, INSERT | ALL |

---

## 4. Role Escalation Prevention

To prevent customers from escalating their role to `manager` or `admin` via Supabase client updates, a PostgreSQL trigger fires on `public.profiles`:

```sql
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
```

---

## 5. API Key Hygiene & Secret Protection

- **Client-Side Safe Keys:**
  - `VITE_SUPABASE_URL`: Public endpoint.
  - `VITE_SUPABASE_ANON_KEY`: Public anonymous key governed by RLS.
  - `VITE_RAZORPAY_KEY_ID`: Public test/live key identifier for Razorpay Checkout.js.
- **Restricted Server-Side Keys (Never in Frontend Code):**
  - `SUPABASE_SERVICE_ROLE_KEY`: Bypasses RLS. NEVER stored in `.env`, `Vite`, or Git.
  - `RAZORPAY_KEY_SECRET`: Used solely for server-side webhook signature verification.

---

## 6. Integer Arithmetic & Currency Protection

All prices are stored and calculated in **Paise** ($1\text{ INR} = 100\text{ paise}$).
- Eliminates floating point rounding inconsistencies across client devices.
- Ensures unit and total contribution calculations match C30 test assertions to the exact integer paise.
