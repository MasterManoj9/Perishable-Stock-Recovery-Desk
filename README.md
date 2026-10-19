# FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk

[![Automated Tests](https://img.shields.io/badge/tests-200%2F200%20passing-brightgreen.svg)]()
[![Case Outcome Checks](https://img.shields.io/badge/case%20checks-25%2F25%20pts-emerald.svg)]()
[![Production Build](https://img.shields.io/badge/build-passing%20(Vite)-blue.svg)]()
[![Deployment](https://img.shields.io/badge/deployed-AWS%20Amplify-FF9900.svg)](https://main.d383abo9k5jug.amplifyapp.com/)
[![Database](https://img.shields.io/badge/database-Supabase%20PostgreSQL-3ECF8E.svg)]()
[![Node Runtime](https://img.shields.io/badge/node-v22.13.1-blue.svg)]()
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)]()

> **Intelligent decision-support & recovery platform for café and small grocery managers to inspect ageing inventory, simulate markdown prices and demand scenarios, enforce strict food-safety gates, commit auditable recovery decisions, sell discounted near-expiry products directly to customers with community food donations, route inventory to partner orphanages, and analyze real-time business insights.**
>
> 🌐 **Live Web Application:** [https://main.d383abo9k5jug.amplifyapp.com/](https://main.d383abo9k5jug.amplifyapp.com/)

---

## 1. Executive Summary & Core Rules

The **C30 Perishable Stock Recovery Desk** was built for the **FYND × NMIMS Hyderabad Product & Business Simulation**. It solves the daily operational dilemma faced by perishable food retail managers: balancing cash recovery on ageing stock against strict food-safety regulations and realistic demand limits.

The system enforces three mandatory constraints in strict priority order:

1. **Food Safety & Stock Eligibility (Gate 1):** Expired, damaged, or unresolved cold-chain-exception stock must **never** be recommended, displayed for sale, or purchasable by customers. Attractive profit margins can **never** bypass food safety. Enforced at domain, API, and database Row Level Security (RLS) layers.
2. **Economics (Gate 2):** Markdowns must respect store contribution policies ($P \ge C$, $\text{Unit Contribution} = P - C > 0$) and maximum allowed markdown percentages.
3. **Demand Capping & Stock Accounting (Gate 3):** Allocated quantity is strictly capped by available eligible stock and evidenced demand:
   $$\text{Allocated Quantity} = \min(Q_{\text{eligible}}, D_{\text{supported}})$$
   $$\text{Unsold Quantity} = Q_{\text{eligible}} - \text{Allocated Quantity}$$
   $$\text{Total Contribution} = \text{Unit Contribution} \times \text{Allocated Quantity}$$
   All unsold stock remains **visibly accounted for** at all times.

> [!IMPORTANT]
> **Mandatory Evidence Rule:** Synthetic fixture data demonstrates algorithmic correctness, safety gating, and user interface responsiveness, but must never be presented as proof of live store revenue, real waste reduction, customer demand, or actual willingness to pay.

---

## 2. Mandatory Case Outcome Checks (25 / 25 Points)

Executed directly in pure domain logic and verified live in the UI (`/reports` view) in exact printed order:

| Check | Points | Input Scenario | Expected Outcome | Actual Verification | Status |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **Check 1** | **10 pts** | 10 units sold @ ₹40; incremental cost ₹25/unit | $\text{Unit} = ₹15$, $\text{Total} = ₹150$ | Unit: ₹15.00, Total: ₹150.00 | **PASS** |
| **Check 2** | **10 pts** | Expired Batch B2 (Price ₹50, Cost ₹20, Margin +₹30) | Sale hard-blocked, sellable qty = 0, alloc = 0, contrib = ₹0 | Blocked, 0 sellable units, reason logged | **PASS** |
| **Check 3** | **5 pts** | **Part A:** 8 avail vs 12 demand<br>**Part B:** 12 avail vs 8 demand | **A:** 8 alloc, 0 unsold, 4 unmet<br>**B:** 8 alloc, 4 unsold, 0 unmet | **A:** 8 alloc, 4 unmet<br>**B:** 8 alloc, 4 unsold visible | **PASS** |

**Total Evaluation Score: 25 / 25 Points (100% Compliant)**

---

## 3. Technology Stack & Full-Stack Architecture

- **Frontend Framework:** React 19.3.1 (JavaScript, ES Modules)
- **Build Tool & Dev Server:** Vite 8.3.4 (HMR, minified production build in ~8.5s)
- **Styling:** Tailwind CSS 4.3.3 + Custom CSS Tokens (Sleek dark theme `#0f172a`, glassmorphism, accent colors)
- **Charts & Visualizations:** Recharts 3.10.1 (Area Charts, Responsive Containers, Pie & Donut Charts)
- **Icons:** Lucide React 1.59.0
- **Database Backend:** Supabase PostgreSQL 15+ with Row Level Security (RLS) policies & 7 migrations
- **Monetary Representation:** Integer paise (`BIGINT` in DB, e.g. ₹40.00 = 4000 paise) preventing floating-point rounding errors
- **Payments:** Razorpay Checkout simulation with idempotent stock deductions and webhook verification
- **Test Runner:** Node.js native test runner (`node:test`, `node:assert/strict`) — **200 tests, 54 suites (100% passing)**
- **Dual Runtime Support:** Client-side Web Storage fallback (`localStorage`) + cloud Supabase PostgreSQL adapter

### Codebase Organization

```
f:\FYND X GENESIS\
├── Starter_Data/C30/fixture.json               # Authoritative official fixture (B1, B2) — UNTOUCHED
├── supabase/                                   # Production PostgreSQL Migrations & Setup
│   ├── COMBINED_SETUP.sql                      # All-in-one idempotent setup script (Migrations 001-007)
│   └── migrations/
│       ├── 001_initial_schema.sql              # 12 core tables with integer paise & foreign keys
│       ├── 002_row_level_security.sql          # Food safety RLS policies & role isolation
│       ├── 003_seed_data.sql                   # Store profile, products, & C30 test fixtures
│       ├── 004_predict_forecasting.sql         # Dynamic demand estimation & forecasting procedures
│       ├── 005_product_deletion_and_archive.sql# Soft deletion & compliance auditing
│       ├── 006_auto_decrement_inventory_stock.sql # Automated trigger for customer order stock deduction
│       └── 007_orphanage_donations_and_clearance.sql # Orphanage routing, clearance markdown, & ₹1 donation tracking
├── src/
│   ├── domain/                                 # Pure ES Modules (Decoupled from UI)
│   │   ├── validation.js                       # Defensive boundary & schema validators
│   │   ├── eligibility.js                      # Centralized food safety & cold-chain gate
│   │   ├── economics.js                        # Financial contribution & markdown policies
│   │   ├── allocation.js                       # Demand-capped stock allocation & balance
│   │   ├── recommendations.js                  # Deterministic decision orchestration
│   │   └── caseChecksRunner.js                 # Single source of truth for the 3 case checks
│   ├── data/
│   │   ├── fixtureLoader.js                    # Normalization layer (24-batch demo & official fixture)
│   │   ├── storeCatalog.js                     # Realistic 24-batch café store demo inventory
│   │   ├── decisionStore.js                    # Decision audit log & RFC 4180 CSV export
│   │   ├── orderStore.js                       # Orders, payments, donations, orphanage tracking, feedback
│   │   └── supabaseAdapter.js                  # Unified cloud/local storage database bridge
│   ├── lib/
│   │   ├── auth.js                             # Authentication context & user session provider
│   │   ├── cartContext.js                      # Customer cart provider with quantity bounds
│   │   ├── notificationContext.js              # Real-time multi-role notification store
│   │   ├── paymentGateway.js                   # Razorpay checkout & payment processing engine
│   │   └── supabase.js                         # Supabase client initializer
│   ├── components/                             # Reusable design system components
│   │   ├── AppShell.jsx                        # Manager dark sidebar shell with role switcher
│   │   ├── ProtectedRoute.jsx                  # Role-based route authorization guard
│   │   ├── StatusBadge.jsx                     # Visual safety badges (Eligible, Expired, Cold Chain)
│   │   ├── EmptyState.jsx                      # Zero-state handler
│   │   ├── ErrorMessage.jsx                    # Error recovery card with retry trigger
│   │   └── LoadingState.jsx                    # Non-blocking loading indicator
│   ├── features/
│   │   ├── dashboard/                          # Manager Dashboard: KPIs, Donut chart, Needs Immediate Action
│   │   │   ├── DashboardPage.jsx               # 2-section immediate action panel (Expiring Soon & Low Sale Rate)
│   │   │   ├── OrphanageDonationModal.jsx      # Orphanage routing, location selector, ₹1 micro-donation counter
│   │   │   └── AdjustDiscountModal.jsx         # Interactive markdown clearance slider bar (5%-90%)
│   │   ├── inventory/                          # Inventory Table, multi-facet filters, Batch modal
│   │   │   ├── InventoryPage.jsx               # Inventory management with bulk operations
│   │   │   ├── BatchDetails.jsx                # Batch modal with donate & discount clearance triggers
│   │   │   └── BulkUploadModal.jsx             # CSV bulk upload with flexible header mapping & auto-validation
│   │   ├── simulator/                          # Markdown Simulator, price slider, confirm modal
│   │   ├── decisions/                          # Decision audit log, RFC 4180 CSV & JSON export
│   │   ├── reports/                            # 25-pt case checks runner & MBA feedback
│   │   ├── insights/                           # Business Insights: Recharts analytics, 6 date filters
│   │   ├── notifications/                      # Manager operational alert center
│   │   ├── feedback/                           # Customer reviews & manager response portal
│   │   └── customer/                           # Customer Experience:
│   │       ├── ShopPage.jsx                    # Discounted catalog with instant markdown reflection
│   │       ├── CartPage.jsx                    # Cart with ₹1 food donation & Razorpay checkout
│   │       ├── OrdersPage.jsx                  # Customer order history & tracking
│   │       ├── CustomerFeedbackPage.jsx        # Customer star ratings & category reviews
│   │       ├── CustomerNotificationsPage.jsx   # In-app customer alerts
│   │       └── CustomerShell.jsx               # Customer header with "Manager Desk" toggle
│   └── tests/                                  # 200 automated unit & integration tests
│       ├── validation.test.js
│       ├── eligibility.test.js
│       ├── economics.test.js
│       ├── allocation.test.js
│       ├── caseChecks.test.js
│       ├── dashboardMetrics.test.js
│       ├── inventoryFilters.test.js
│       ├── fixtureLoader.test.js
│       ├── decisionStore.test.js
│       ├── simulator.test.js
│       ├── reliabilityEdgeCases.test.js
│       ├── businessInsights.test.js            # Analytics date filters, repeat purchases, waste ratios
│       ├── orderAndDonation.test.js            # Price snapshots, donation verification, feedback constraints
│       ├── stockDeductionWorkflow.test.js      # Bi-directional inventory deductions & CSV bulk upload
│       └── immediateActionDonationAndDiscount.test.js # Needs Immediate Action 2-section & clearance tests
```

---

## 4. Key Functional Capabilities

### 4.1 Manager Decision Desk
1. **Executive Dashboard (`/`):**
   - 4 executive KPI cards: Total Batches, Eligible for Sale, Blocked from Sale, Expiring Soon.
   - SVG Stock Status Donut Chart with live batch percentages and Inventory Stock Valuation strip.
   - **Needs Immediate Action Card (Dual-Section Workspace):**
     - **🚨 Expiring within 3 Days:** Isolates safe, non-expired inventory expiring within 72 hours (`daysUntilExpiry <= 3`).
     - **📉 Low Sale Rate:** Identifies slow-moving or low-demand velocity inventory batches (`demandAssumption < qty` or `demandEvidence === 'None'/'Available (Low)'`).
     - **Action 1: 🎁 Donate to Orphans:**
       - Location-based Orphanage selector (*"Select Orphanage through Location"* across major metro hubs).
       - Transparent onboarding empty-state with a `+ Request Orphanage Onboarding` trigger.
       - Customer ₹1 micro-donation transparent tracker: Displays count and rupee total of ₹1 checkout contributions collected till now.
       - Total Donated Metric: Real-time sum of ₹1 customer micro-funds + retail food valuation of all donated batches.
       - Quantity selector to donate batch units or zero out entire inventory, logging to `orphanage_batch_donations`.
     - **Action 2: 🏷️ Keep More Discount:**
       - Interactive clearance discount range slider bar (**5% to 90%**) plus quick preset pills (25%, 40%, 50%, 60%, 70%, 80%).
       - Live financial breakdown: Original Price vs. New Selling Price, Customer Savings (₹), and Unit Margin check.
       - **Immediate Cross-System Reflection:** Instantly reflects in Manager Inventory and Customer Shop (`/shop`), updating customer product cards and cart prices in real time.
2. **Inventory Management (`/inventory`):**
   - **Bulk CSV Product Upload:** Upload multiple batches simultaneously from CSV files with flexible column matching (`productName`, `category`, `qty`, `originalPrice`, `incrementalCost`, `expiryAt`, `condition`, `coldChainStatus`).
   - **Bi-Directional Real-Time Stock Deduction:** Adding stock (e.g., Bread 5 units) reflects in the customer shop; when a customer purchases 2 units, stock automatically decrements to 3 units in the manager inventory across tabs and PostgreSQL tables.
   - Multi-facet filters: Safety Status, Product Category, Expiry Window.
   - Live search across Batch ID and Product Name.
   - Sortable columns: Batch ID, Product, Expiry, Price, Cost, Margin, Stock Qty, Safety Status.
   - Batch Details modal with 4-metric grid, 4-attribute grid, and direct transition to simulator or quick donation/discount actions.
   - Manual batch creation form for ad-hoc inventory entry.
3. **Interactive Markdown Simulator (`/simulator`):**
   - Dynamic price slider and numeric input bounded by cost $C$ and markdown caps.
   - Quick demand scenario selectors (Pessimistic 5, Base 10, Optimistic 15, Zero 0).
   - Real-time calculations: Discount %, Unit Contribution, Capped Allocation, Unsold Stock, Unmet Demand, Total Contribution.
   - Food Safety Hard-Stop: Expired, damaged, or cold-chain exception stock is strictly blocked from sale.
   - **Unapproved Theoretical Margin** alert card for safety-blocked items with positive superficial margins.
   - Decision Confirmation Modal with before/after audit snapshot.
4. **Decisions Audit Trail (`/decisions`):**
   - Persistent audit history with immutable before/after snapshots.
   - Export Decision Audit Log as **RFC 4180-compliant CSV** with field escaping.
   - Export Decision Audit Log as formatted **JSON**.
5. **Reports & Case Checks Center (`/reports`):**
   - Automated runner for the 3 official case checks (25/25 Points).
   - Re-run verification trigger with instant audit results.
   - Export system evidence package.
6. **Business Insights & Analytics (`/insights`):**
   - Real-time analytics dashboard powered by **Recharts**:
     - Revenue & Recovery Trend (Area Chart) tracking gross recovery vs. original value.
     - Food Safety & Waste Breakdown (Pie Chart) segmenting sold recovery, expired loss, and damaged discard.
   - 6 Quick Date-Range Presets: Weekly (7D), Monthly (30D), Last 3 Months (90D), Last 6 Months (180D), Last 1 Year (365D), All Time.
   - 4 Summary KPI Cards: Gross Sales, Net Recovery Contribution, Verified Food Donations, Total Food Rescued.
   - Top Month Indicator and Repeat Customer Purchase Rate metric.
   - Top Recovered Products performance leaderboard.
7. **Manager Alert Center (`/notifications`):**
   - Live operational alerts for newly placed customer recovery orders.
   - Verified ₹1 community food donation notifications.
   - Critical inventory alerts for expiring and quarantined stock.
8. **Feedback & Reviews (`/feedback`):**
   - Review incoming customer ratings and experience comments.
   - Multi-category ratings (Freshness, Packaging, Value).
   - Manager reply submission portal updating customer orders in real time.

### 4.2 Customer Recovery Shopping Experience
1. **Discounted Catalog (`/shop`):**
   - Browse near-expiry perishable products marked down for rapid recovery.
   - Strict food safety filtering: Expired (`B2`) and damaged (`B3`) batches are **never** visible to customers.
   - Visual tags displaying remaining shelf life ("Expires in 6h"), original price, discounted price, and % off.
   - Real-time price updates whenever manager adjusts clearance discounts.
2. **Cart & Community Donation (`/cart`):**
   - Line-item quantity controls strictly bounded by available batch stock.
   - **₹1 Community Food Recovery Donation:** Optional checkbox adding exactly 100 paise to support local hunger relief NGOs and orphanages.
   - Immutable price snapshotting: Cart items lock in the exact markdown price at checkout time.
3. **Razorpay Checkout Flow:**
   - Simulated payment modal with Card, UPI, and Netbanking options.
   - Idempotent stock deduction: Confirmed payments atomically deduct stock from the inventory catalog and Supabase database.
   - Immediate order confirmation with unique `ORD-...` tracking identifiers.
4. **Order History (`/orders`):**
   - View past recovery purchases, delivery statuses, and payment receipts.
   - Direct button to submit post-purchase feedback and star ratings.
5. **Customer Notifications (`/customer-notifications`):**
   - Real-time alerts on payment confirmation, order fulfillment, and manager responses to customer feedback.

---

## 5. Quickstart & Verification Instructions

### Prerequisites
- Node.js `v18+` (Tested and verified on `v22.13.1`)
- npm `v9+` (Tested on `10.9.2`)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm test
```
*Expected Output: **200 tests across 54 suites passing in <380ms (0 failures, 0 skipped, 100% compliant)**.*

### 3. Run Specific Test Suites
```bash
# Run mandatory 25-point case checks:
node --test src/tests/caseChecks.test.js

# Run Immediate Action (Orphanage Donation & Clearance Discount) tests:
node --test src/tests/immediateActionDonationAndDiscount.test.js

# Run Stock Deduction & CSV Bulk Upload workflow tests:
node --test src/tests/stockDeductionWorkflow.test.js

# Run Business Insights analytics tests:
node --test src/tests/businessInsights.test.js

# Run Order, Payment, and Donation tests:
node --test src/tests/orderAndDonation.test.js
```

### 4. Build for Production
```bash
npm run build
```
*Expected Output: Zero errors; optimized bundle generated in `dist/` with zero warnings.*

### 5. Run Local Preview / Development Server
```bash
# Start Vite development server:
npm run dev

# Or preview the production build directly:
npm run preview -- --port 5000
```
Open `http://localhost:5000/` in your browser. Use the header button to switch seamlessly between **Manager Desk** and **Customer Shop**.

---

## 6. Database Configuration (Supabase PostgreSQL)

The platform is designed with a hybrid persistence architecture:
1. **Local Mode (Default):** Runs immediately out of the box with zero configuration using browser `localStorage` and memory caching. Ideal for hackathon judging, grading, and offline demonstrations.
2. **Cloud Mode (Supabase):** Connects to a managed Supabase PostgreSQL instance with full Row Level Security (RLS).

To connect to live Supabase:
1. Follow the step-by-step instructions in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
2. Either execute the all-in-one setup script in the Supabase SQL Editor:
   - `supabase/COMBINED_SETUP.sql`
   Or run the individual migrations in order:
   - `supabase/migrations/001_initial_schema.sql` (12 core tables & foreign keys)
   - `supabase/migrations/002_row_level_security.sql` (Food safety RLS & customer isolation)
   - `supabase/migrations/003_seed_data.sql` (Catalog products & baseline fixtures)
   - `supabase/migrations/004_predict_forecasting.sql` (Predictive demand forecasting engine)
   - `supabase/migrations/005_product_deletion_and_archive.sql` (Audit-safe product archiving)
   - `supabase/migrations/006_auto_decrement_inventory_stock.sql` (Atomic order stock deduction trigger)
   - `supabase/migrations/007_orphanage_donations_and_clearance.sql` (Orphanage routing & clearance discounts)
3. Create a `.env` file with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## 7. Accompanying Documentation

### Technical Architecture & Full-Stack Upgrades
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md): Complete PostgreSQL ERD, 12 table schemas, foreign keys, and integer paise convention.
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md): Step-by-step Supabase cloud provisioning, migration runbook, and environment setup.
- [SECURITY_AND_RLS.md](./SECURITY_AND_RLS.md): Row Level Security defense-in-depth model, customer isolation, and safety gating.
- [SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md): Complete data migration and architecture roadmap.
- [FEATURE_GAP_AUDIT.md](./FEATURE_GAP_AUDIT.md): Comprehensive feature audit matrix comparing prototype vs. production full-stack implementation.
- [PAYMENT_GATEWAY_SETUP.md](./PAYMENT_GATEWAY_SETUP.md): Razorpay checkout integration, payment verification, and idempotent stock updates.
- [BUSINESS_INSIGHTS_METHODOLOGY.md](./BUSINESS_INSIGHTS_METHODOLOGY.md): Financial analytics formulas, repeat purchase rate, and recovery ratios.
- [TESTING_REPORT.md](./TESTING_REPORT.md): Complete test suite verification report (200/200 passing tests across 54 suites, 25/25 case checks).

### Business Model & Commercial Readiness
- [FYND_C30_Project_Requirements.md](./FYND_C30_Project_Requirements.md): Core requirements, formulas, and constraints.
- [MBA_BUSINESS_MODEL.md](./MBA_BUSINESS_MODEL.md): Customer segment analysis, pricing tiers, cost-to-serve, and unit economics.
- [FIRST_CUSTOMER_EXPERIMENT.md](./FIRST_CUSTOMER_EXPERIMENT.md): Discovery interview script, outreach protocol, and evaluation criteria.
- [SUPERVISED_PILOT_PLAN.md](./SUPERVISED_PILOT_PLAN.md): 5-day single-store field trial protocol, measurement formulas, and abort triggers.
- [EVIDENCE_AND_ASSUMPTIONS.md](./EVIDENCE_AND_ASSUMPTIONS.md): 13-point epistemic audit classifying claims into facts, calculations, and hypotheses.
- [JUDGE_DEMO_SCRIPT.md](./JUDGE_DEMO_SCRIPT.md): 4.5-minute timed judging presentation script with fallback contingencies.
- [FINAL_HANDOFF_REPORT.md](./FINAL_HANDOFF_REPORT.md): Final master system handoff report.

---

## 8. Troubleshooting & Common Operational Issues

### 8.1 Port In Use (`EADDRINUSE: 5000` or `5173`)
If port 5000 or the default Vite port is already occupied:
```bash
npm run dev -- --port 3000
npm run preview -- --port 3000
```

### 8.2 Switching Between Manager Desk and Customer Shop
- Click the **"Switch to Customer Shop"** / **"Manager Desk"** badge located in the navigation header at any time.
- State is preserved seamlessly across switches.

### 8.3 Resetting Demo Data
If test orders or simulated decisions need to be cleared:
1. In the **Decisions (`/decisions`)** page, click **"Clear History"**.
2. Or run in browser console:
   ```javascript
   localStorage.clear(); location.reload();
   ```

### 8.4 Production Build Verification
To verify production bundle build and preview:
```bash
npm run build
npm run preview -- --port 5000
```
Then visit `http://localhost:5000/` to test minified production assets.


