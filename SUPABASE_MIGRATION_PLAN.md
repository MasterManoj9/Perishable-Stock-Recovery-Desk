# FYND × NMIMS Hyderabad — C30: Supabase Migration & Feature Extension Plan

## 1. Architecture Overview

### Current State (SPA — Module 0–6 Complete)
- **Framework:** React 19 + Vite 8 + Tailwind CSS 4
- **Domain Engine:** Pure ES module domain engine (`validation.js`, `eligibility.js`, `economics.js`, `allocation.js`, `recommendations.js`)
- **Persistence:** LocalStorage persistence with fallback in-memory adapters (`decisionStore.js`, `orderStore.js`)
- **Test Baseline:** 145 passing unit tests (Node.js native test runner `node --test`)
- **Catalog:** 24-batch demo catalog + 2-batch official case fixture (`B1` & `B2`)

### Target Full-Stack State (Fully Implemented)
- **Database & RLS:** Supabase PostgreSQL with Row Level Security enforcing food safety guardrails directly at the database tier.
- **Authentication:** Role-based authentication (`manager` vs `customer`) with session persistence.
- **Customer Shopping Flow:** Live product catalogue, near-expiry badges, cart with dynamic quantity capping.
- **Payment & ₹1 Donation:** Integrated checkout with optional ₹1 food recovery donation and atomic stock reservation.
- **Notification Center:** In-app operational and customer notification center replacing legacy "Store Demo".
- **Customer Feedback:** Post-purchase customer ratings and manager response dashboard.
- **Business Insights:** Comprehensive analytics tab with date-range filters (Weekly, Monthly, 3M, 6M, 1Y, All Time), sales trends, top product rankings, and repeat purchase cohort analytics.

---

## 2. Implementation Phases & Completion Status

| Phase | Description | Status | Deliverables |
|---|---|:---:|---|
| **Phase 0** | Repository Audit, Feature Gap Analysis, Baseline Verification | **PASS** | [`FEATURE_GAP_AUDIT.md`](./FEATURE_GAP_AUDIT.md), [`SUPABASE_MIGRATION_PLAN.md`](./SUPABASE_MIGRATION_PLAN.md) |
| **Phase 1** | Supabase Foundation, SQL Schemas, RLS, Auth, Seed Data | **PASS** | [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql), [`002_row_level_security.sql`](./supabase/migrations/002_row_level_security.sql), [`003_seed_data.sql`](./supabase/migrations/003_seed_data.sql), [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md), [`SECURITY_AND_RLS.md`](./SECURITY_AND_RLS.md), [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) |
| **Phase 2** | Persistent Manager Inventory & Data Access Layer | **PASS** | [`src/data/supabaseAdapter.js`](./src/data/supabaseAdapter.js), [`src/data/orderStore.js`](./src/data/orderStore.js) |
| **Phase 3** | Customer Dashboard & Shopping Experience | **PASS** | [`src/features/customer/ShopPage.jsx`](./src/features/customer/ShopPage.jsx), [`CustomerShell.jsx`](./src/features/customer/CustomerShell.jsx) |
| **Phase 4** | Orders, Razorpay Checkout & ₹1 Donation Checkbox | **PASS** | [`src/features/customer/CartPage.jsx`](./src/features/customer/CartPage.jsx), [`OrdersPage.jsx`](./src/features/customer/OrdersPage.jsx), [`PAYMENT_GATEWAY_SETUP.md`](./PAYMENT_GATEWAY_SETUP.md) |
| **Phase 5** | Notification Center & Customer Feedback System | **PASS** | [`src/features/notifications/ManagerNotificationsPage.jsx`](./src/features/notifications/ManagerNotificationsPage.jsx), [`CustomerNotificationsPage.jsx`](./src/features/customer/CustomerNotificationsPage.jsx), [`ManagerFeedbackPage.jsx`](./src/features/feedback/ManagerFeedbackPage.jsx), [`CustomerFeedbackPage.jsx`](./src/features/customer/CustomerFeedbackPage.jsx) |
| **Phase 6** | Business Insights Dashboard & Date-Range Analytics | **PASS** | [`src/features/insights/BusinessInsightsPage.jsx`](./src/features/insights/BusinessInsightsPage.jsx), [`BUSINESS_INSIGHTS_METHODOLOGY.md`](./BUSINESS_INSIGHTS_METHODOLOGY.md) |
| **Phase 7** | Automated Test Verification, Security Validation & Final Handoff | **PASS** | 145 passing tests, [`TESTING_REPORT.md`](./TESTING_REPORT.md), [`FINAL_HANDOFF_REPORT.md`](./FINAL_HANDOFF_REPORT.md) |

---

## 3. Strict Safety & Integrity Constraints
1. **Zero Domain Logic Alteration:** `src/domain/*` files remain untouched.
2. **Official Fixture Inviolability:** `Starter_Data/C30/fixture.json` remains completely unmodified.
3. **Food Safety Rule Independence:** Expired stock (`B2`) and damaged stock (`B3`) can never be sold, purchased, or bypassed via any manager or customer action.
4. **No Float Arithmetic:** All monetary fields stored as integer paise ($1\text{ INR} = 100\text{ paise}$).
