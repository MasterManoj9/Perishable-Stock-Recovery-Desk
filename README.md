# FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk

[![Automated Tests](https://img.shields.io/badge/tests-136%2F136%20passing-brightgreen.svg)]()
[![Case Outcome Checks](https://img.shields.io/badge/case%20checks-25%2F25%20pts-emerald.svg)]()
[![Production Build](https://img.shields.io/badge/build-passing%20(422ms)-blue.svg)]()
[![Node Runtime](https://img.shields.io/badge/node-v22.13.1-blue.svg)]()
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)]()

> **Intelligent decision-support web application for café and small grocery managers to inspect ageing inventory, simulate markdown prices and demand scenarios, enforce strict food-safety gates, commit auditable recovery decisions, and export compliance evidence.**

---

## 1. Executive Summary & Core Rules

The **C30 Perishable Stock Recovery Desk** was built for the **FYND × NMIMS Hyderabad Product & Business Simulation**. It solves the daily operational dilemma faced by perishable food retail managers: balancing cash recovery on ageing stock against strict food-safety regulations and realistic demand limits.

The system enforces three mandatory constraints in strict priority order:

1. **Food Safety & Stock Eligibility (Gate 1):** Expired, damaged, or unresolved cold-chain-exception stock must **never** be recommended or approved for sale. Attractive profit margins can **never** bypass food safety.
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

## 3. Technology Stack & Architecture

- **Frontend Framework:** React 19.3.1
- **Build Tool & Dev Server:** Vite 8.3.4
- **Styling:** Tailwind CSS 4.3.3 + Vanilla CSS design tokens
- **Icons:** Lucide React 1.16.0
- **Test Runner:** Node.js native test runner (`node:test`, `node:assert/strict`)
- **Persistence:** Client-side Web Storage (`localStorage`) with RFC 4180 CSV & JSON exporters
- **Node Environment:** Node.js `v22.13.1`, npm `10.9.2`

### Codebase Organization

```
f:\FYND X GENESIS\
├── Starter_Data/C30/fixture.json       # Authoritative official fixture (B1, B2)
├── src/
│   ├── domain/                         # Pure ES Modules (Decoupled from UI)
│   │   ├── validation.js               # Defensive boundary & schema validators
│   │   ├── eligibility.js              # Centralized food safety & cold-chain gate
│   │   ├── economics.js                # Financial contribution & markdown policies
│   │   ├── allocation.js               # Demand-capped stock allocation & balance
│   │   ├── recommendations.js          # Deterministic decision orchestration
│   │   └── caseChecksRunner.js         # Single source of truth for the 3 case checks
│   ├── data/
│   │   ├── fixtureLoader.js            # Normalization layer (supports 24B & official 2B)
│   │   ├── storeCatalog.js             # Realistic 24-batch café store demo inventory
│   │   └── decisionStore.js            # LocalStorage persistence & RFC 4180 CSV export
│   ├── components/                     # Reusable design system components
│   │   ├── AppShell.jsx                # Modern dark sidebar layout (#0f172a)
│   │   ├── StatusBadge.jsx             # Visual safety badges (Eligible, Expired, Cold Chain)
│   │   ├── EmptyState.jsx              # Zero-state handler
│   │   ├── ErrorMessage.jsx            # Error recovery card with retry trigger
│   │   └── LoadingState.jsx            # Non-blocking loading indicator
│   ├── features/                       # Five distinct, fully-functioning application modules
│   │   ├── dashboard/                  # DashboardPage: 4 KPIs, SVG Donut, Attention list
│   │   ├── inventory/                  # InventoryPage, InventoryTable, BatchDetails modal
│   │   ├── simulator/                  # SimulatorPage, DecisionConfirmModal (pricing & demand)
│   │   ├── decisions/                  # DecisionsPage: audit log, RFC 4180 CSV & JSON export
│   │   └── reports/                    # ReportsPage: 25-pt case checks runner & MBA feedback
│   └── tests/                          # 136 automated Node.js test runner unit & edge tests
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
│       └── reliabilityEdgeCases.test.js
```

---

## 4. Key Functional Capabilities

1. **Dashboard (`/`):**
   - 4 executive KPI cards: Total Batches, Eligible for Sale, Blocked from Sale, Expiring Soon.
   - SVG Stock Status Donut Chart with live batch percentages.
   - Immediate Attention Required feed linking directly to batch details or the simulator.
2. **Inventory Management (`/inventory`):**
   - Multi-facet filters: Safety Status, Product Category, Expiry Window.
   - Live search across Batch ID and Product Name.
   - Sortable columns: Batch ID, Product, Expiry, Price, Cost, Margin, Stock Qty, Safety Status.
   - Batch Details modal with 4-metric grid, 4-attribute grid, and direct transition to the simulator.
   - Manual batch creation form for ad-hoc inventory entry.
3. **Interactive Markdown Simulator (`/simulator`):**
   - Dynamic price slider and direct numeric input bounded by cost $C$ and markdown caps.
   - Quick demand scenario selectors (Pessimistic 5, Base 10, Optimistic 15, Zero 0).
   - Real-time calculations: Discount %, Unit Contribution, Capped Allocation, Unsold Stock, Unmet Demand, Total Contribution.
   - Food Safety Hard-Stop: Expired, damaged, or cold-chain exception stock is strictly blocked from sale.
   - **Unapproved Theoretical Margin** alert card for safety-blocked items with positive superficial margins.
   - Decision Confirmation Modal with before/after audit snapshot.
4. **Decisions Audit Trail (`/decisions`):**
   - Persistent `localStorage` audit history under `c30_decisions_v1`.
   - Export Decision Audit Log as **RFC 4180-compliant CSV** with field escaping.
   - Export Decision Audit Log as formatted **JSON**.
5. **Reports & Case Checks Center (`/reports`):**
   - Automated runner for the 3 official case checks (25/25 Points).
   - Re-run verification trigger with instant audit results.
   - Export system evidence package.
6. **Dual Dataset Switcher:**
   - Switch seamlessly between **Store Demo (24 Batches)** (full café catalog) and **Official Fixture (B1 & B2)** (official grading testbed).

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
*Expected Output: 136 tests across 50 suites passing in <200ms.*

### 3. Run Mandatory Case Checks Specifically
```bash
node --test src/tests/caseChecks.test.js
```
*Expected Output: 3 tests across 1 suite passing (25/25 Points).*

### 4. Build for Production
```bash
npm run build
```
*Expected Output: Zero errors; optimized bundle generated in `dist/` in <500ms.*

### 5. Run Local Preview / Development Server
```bash
# Start Vite development server:
npm run dev

# Or preview the production build directly:
npm run preview -- --port 5000
```
Open `http://localhost:5000/` in your browser.

---

## 6. Static Deployment Instructions

The application is structured as a zero-backend Single Page Application (SPA), making it natively deployable to any modern static hosting service:

### Option A: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project root.
3. Settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Option B: Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run `netlify deploy --dir=dist --prod`

---

## 7. Known Boundaries & Limitations

1. **Client-Side Storage Scope:** The application uses browser `localStorage` for decision audit logging. While resilient against JSON corruption and storage quota errors, it does not replace a centralized multi-terminal database (e.g., PostgreSQL/Supabase) in multi-store enterprise settings.
2. **Cold-Chain Telemetry:** Cold-chain statuses are currently ingested from batch metadata. Direct integration with IoT Bluetooth/Wi-Fi temperature loggers is planned for post-pilot development.
3. **Synthetic Data Non-Claim:** All economic calculations and demo catalog records are synthetic models designed to validate software logic and decision workflows. Real waste reduction and customer willingness to pay will be evaluated through the supervised pilot protocol (`SUPERVISED_PILOT_PLAN.md`).

---

## 8. Accompanying Documentation

- [FYND_C30_Project_Requirements.md](./FYND_C30_Project_Requirements.md): Core requirements, formulas, and constraints.
- [GAP_AUDIT_REPORT.md](./GAP_AUDIT_REPORT.md): Complete cross-module project gap audit and baseline verification report.
- [MBA_BUSINESS_MODEL.md](./MBA_BUSINESS_MODEL.md): Customer segment analysis, pricing tiers, cost-to-serve, and unit economics.
- [FIRST_CUSTOMER_EXPERIMENT.md](./FIRST_CUSTOMER_EXPERIMENT.md): Discovery interview script, outreach protocol, and evaluation criteria.
- [SUPERVISED_PILOT_PLAN.md](./SUPERVISED_PILOT_PLAN.md): 5-day single-store field trial protocol, measurement formulas, and abort triggers.
- [EVIDENCE_AND_ASSUMPTIONS.md](./EVIDENCE_AND_ASSUMPTIONS.md): 13-point epistemic audit classifying claims into facts, calculations, and hypotheses.
- [JUDGE_DEMO_SCRIPT.md](./JUDGE_DEMO_SCRIPT.md): 4.5-minute timed judging presentation script with fallback contingencies.
- [MODULE_5_BUSINESS_FEEDBACK_EVIDENCE.md](./MODULE_5_BUSINESS_FEEDBACK_EVIDENCE.md): Before-and-after evidence for food-safety precedence over margin.
- [MODULE_5_COMPLETION_REPORT.md](./MODULE_5_COMPLETION_REPORT.md): Reliability and edge-case verification report.
- [MODULE_6_COMPLETION_REPORT.md](./MODULE_6_COMPLETION_REPORT.md): MBA integration, commercial model, and deployment completion report.
- [FINAL_HANDOFF_REPORT.md](./FINAL_HANDOFF_REPORT.md): Final master system handoff report.

---

## 9. Troubleshooting & Common Operational Issues

### 9.1 Port In Use (`EADDRINUSE: 5000` or `5173`)
If port 5000 or the default Vite port is already occupied by another process:
```bash
# Start dev server on an alternate port:
npm run dev -- --port 3000

# Or start preview server on an alternate port:
npm run preview -- --port 3000
```

### 9.2 Resetting Local Browser Decision History
If `localStorage` contains test records from previous manual testing sessions that you want to reset:
1. Navigate to the **Decisions (`/decisions`)** page in the application.
2. Click the red **"Clear History"** button in the top action bar to reset storage cleanly.
3. Or open browser Developer Tools (F12) -> Console and run:
   ```javascript
   localStorage.removeItem('c30_decisions_v1'); location.reload();
   ```

### 9.3 Test Runner on Windows / PowerShell
All automated tests use the Node.js native test runner (`node --test`):
```bash
# Run all tests:
npm test

# Run a specific test suite:
node --test src/tests/caseChecks.test.js
node --test src/tests/reliabilityEdgeCases.test.js
```
*Note: Ensure Node.js v18.0.0 or higher is installed (tested on v22.13.1).*

### 9.4 Production Build Verification
To ensure the production bundle builds without errors and serves correctly:
```bash
npm run build
npm run preview -- --port 5000
```
Then visit `http://localhost:5000/` to test the minified production assets.

