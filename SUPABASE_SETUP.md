# Supabase Cloud Setup & Migration Runbook

## Overview
This runbook explains how to configure a live **Supabase PostgreSQL** instance for the **FYND × NMIMS Hyderabad C30: Perishable Stock Recovery Desk**, execute migrations, and connect the web application.

---

## Step 1: Create a Supabase Project

1. Log in to [Supabase](https://app.supabase.com/).
2. Click **New project**.
3. Choose your organization, assign project name `c30-stock-recovery-desk`, and select region (e.g. `ap-south-1` Mumbai).
4. Save your database password securely.
5. Wait ~60 seconds for the cloud instance to provision.

---

## Step 2: Retrieve API Credentials

1. Navigate to **Project Settings** $\rightarrow$ **API**.
2. Locate the following two values:
   - **Project URL:** `https://<project-ref>.supabase.co`
   - **anon / public key:** `eyJhbGciOi...`
3. Copy these keys into your local environment configuration.

---

## Step 3: Configure Local Environment Variables

Create or update `.env` in the project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key

# Razorpay Configuration (Client-safe key ID only)
VITE_RAZORPAY_KEY_ID=rzp_test_51Abcdef123456

# Application Settings
VITE_APP_NAME="Perishable Stock Recovery Desk"
VITE_DONATION_AMOUNT_PAISE=100
```

> [!CAUTION]
> **Secret Hygiene:** Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RAZORPAY_KEY_SECRET` in client-side `.env` files. Vite embeds any `VITE_*` variable into the frontend JavaScript bundle.

---

## Step 4: Execute SQL Migrations

Open the **SQL Editor** in the Supabase Dashboard and execute the migrations in order:

### 1. Schema Migration: `001_initial_schema.sql`
- Run [`supabase/migrations/001_initial_schema.sql`](file:///f:/FYND%20X%20GENESIS/supabase/migrations/001_initial_schema.sql).
- Creates 12 relational tables: `stores`, `profiles`, `products`, `inventory_batches`, `orders`, `order_items`, `payments`, `donations`, `notifications`, `feedback`, `inventory_movements`, and `decisions`.
- All currency columns use integer paise.

### 2. Security & RLS Migration: `002_row_level_security.sql`
- Run [`supabase/migrations/002_row_level_security.sql`](file:///f:/FYND%20X%20GENESIS/supabase/migrations/002_row_level_security.sql).
- Enables Row Level Security on all tables.
- Applies role-based policies preventing customer access to expired or damaged inventory batches.
- Installs the auto-profile trigger on `auth.users`.

### 3. Seed Data Migration: `003_seed_data.sql`
- Run [`supabase/migrations/003_seed_data.sql`](file:///f:/FYND%20X%20GENESIS/supabase/migrations/003_seed_data.sql).
- Populates the demo store, master product catalog, and mandatory C30 test fixtures (B1 eligible, B2 expired, B3 damaged, B4 exception).

---

## Step 5: Configure Supabase Authentication

1. Go to **Authentication** $\rightarrow$ **Providers**.
2. **Email Provider:**
   - Ensure "Enable Email provider" is turned **ON**.
   - For hackathon/demo speed, turn **Confirm email** **OFF** under Email Auth settings.
3. **URL Configuration:**
   - Set Site URL to `http://localhost:5000` (or your deployment URL).
   - Add `http://localhost:5000/**` to Redirect URLs.

---

## Step 6: Verify Deployment

1. Run `npm test` locally to ensure zero regressions on the 136 domain test suite:
   ```bash
   npm test
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5000` in your browser.
4. When `VITE_SUPABASE_URL` is set, the application automatically routes auth and queries through the live Supabase client.
5. If credentials are unset or invalid, the app gracefully falls back to local storage demo mode without breaking!
