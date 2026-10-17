# MODULE 3 — INTERACTIVE MARKDOWN SIMULATOR COMPLETION REPORT

**Project:** FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk  
**Module:** Module 3 — Interactive Markdown Simulator  
**Date:** October 17, 2026  
**Status:** **COMPLETE — ALL TESTS PASSING (91/91 tests passed) — MANDATORY ACCEPTANCE GATE REACHED**  

---

## 1. Executive Summary

Module 3 delivers the **Interactive Markdown Simulator & Real-Time Allocation Engine** for café and small grocery managers. The module allows managers to select an inventory batch, simulate permitted markdown prices and demand scenarios, determine demand-capped allocations, evaluate gross revenues and incremental recovery costs, verify store contribution margin policies, enforce strict food-safety hard-stops, inspect plain-language recommendations, and reset simulation parameters at will.

Every calculation is strictly routed through the pure domain engine created in Module 1, ensuring zero duplication of business rules and 100% adherence to the official case checks.

---

## 2. Files Created and Modified

| File Path | Type | Role & Responsibility in Module 3 |
| :--- | :--- | :--- |
| [`src/features/simulator/SimulatorPage.jsx`](./src/features/simulator/SimulatorPage.jsx) | UI Component | Primary simulator view featuring batch context header, dual-linked price and markdown % controls, non-clamping validation cards, demand scenario selectors (Fixture, High, Zero, Missing), real-time revenue/cost/contribution breakdown, and plain-language recommendation. |
| [`src/app/App.jsx`](./src/app/App.jsx) | Application Container | Connected `onNavigateToInventory` back navigation and selected batch state passing from Inventory to Simulator. |
| [`src/tests/simulator.test.js`](./src/tests/simulator.test.js) | Automated Test Suite | 19 comprehensive automated tests verifying pricing validation, boundary conditions, demand capping, unsold stock visibility, contribution policies, food safety hard-stops, and immutability. |
| [`MODULE_3_COMPLETION_REPORT.md`](./MODULE_3_COMPLETION_REPORT.md) | Documentation | Formal evidence-backed completion report. |

---

## 3. Implemented User Journey

The end-to-end interactive simulation journey operates as follows:

1. **Inventory Entry & Selection:** A store manager browses the Inventory page, reviews available batches, and clicks `"View"` on any item (or uses the top batch selector).
2. **Transition to Simulator:** In the Batch Details modal, clicking `"Open Markdown Simulator"` carries the selected batch context directly into the Simulator view (`/simulator`).
3. **Comprehensive Batch Context Display:** The Simulator renders the actual batch starting data:
   - Batch ID and Product Name with image/icon
   - Starting inventory on hand ($Q$)
   - Original unit selling price ($P$)
   - Incremental unit recovery cost ($C$)
   - Maximum permitted markdown limit (%) and derived minimum allowed price
   - Expiry date, shelf-life display, and urgency tags
   - Quality condition (`Good` vs `Damaged`)
   - Cold-chain status (`Required (OK)`, `Not required`, `Exception / Review`)
   - Demand evidence description and source (`Fixture Evidenced`)
4. **Food Safety Gate Enforcement:** If the batch is expired (`expired: true`), damaged, or has an unresolved cold-chain exception, the system displays an unmistakable red **`FOOD SAFETY HARD-STOP: SALE STRICTLY PROHIBITED`** banner. Markdown sliders are disabled, sellable quantity is locked to `0`, and the manager is guided to record a disposal/quarantine action. Favorable profit margins cannot bypass safety.
5. **Interactive Markdown Simulation (Dual-Linked Inputs):**
   - Direct INR numeric input (`₹`) and percentage input (`% OFF`).
   - Smooth range slider bounded between allowed price floors and original price.
   - Non-clamping validation: Typing an excessive price or invalid markdown does **not** silently alter user input; it surfaces a clear validation rejection card explaining why the price is invalid.
6. **Demand Scenario Evaluation:**
   - **Fixture Assumption:** Defaulting to the verified fixture demand (`10 units`).
   - **High Scenario:** 15 units.
   - **Zero Demand:** Confirmed 0 demand, allocating 0 units and holding all stock unsold.
   - **Missing Evidence:** Unevidenced demand, flagging a warning that allocation is held at 0 to prevent speculative waste.
   - **Custom Scenario:** Direct integer input.
7. **Demand-Capped Allocation & Visible Unsold Units:**
   - $\text{Projected Units Sold} = \min(Q_{\text{eligible}}, D_{\text{supported}})$
   - $\text{Unsold Quantity} = Q_{\text{eligible}} - \text{Projected Units Sold}$ (strictly accounted for in an amber pill).
   - $\text{Unmet Demand} = \max(0, D - Q_{\text{alloc}})$.
8. **Financial Breakdown:**
   - $\text{Projected Gross Revenue} = P_{\text{proposed}} \times Q_{\text{alloc}}$
   - $\text{Incremental Cost for Sold Units} = C_{\text{inc}} \times Q_{\text{alloc}}$
   - $\text{Unit Contribution} = P_{\text{proposed}} - C_{\text{inc}}$
   - $\text{Total Contribution Recovery} = \text{Unit Contribution} \times Q_{\text{alloc}}$
9. **Store Minimum Contribution Policy:**
   - Evaluates unit contribution against store margin floor policies (`₹0`, `₹5`, or `₹10/u`) and warns the manager if operational costs are at risk.
10. **Reset to Starting Values:** A single click on `"Reset to Starting Values"` restores the batch's initial price and supported demand.
11. **Back Navigation:** A prominent `"Back to Inventory"` button returns to the inventory list without losing application context.

---

## 4. Pure Domain Functions Reused

Zero business logic is reimplemented in React. All calculations are executed by pure ES modules in `src/domain/`:

| Domain Function | Source Module | Role in Simulator |
| :--- | :--- | :--- |
| `validateSimulationParams()` | [`src/domain/validation.js`](./src/domain/validation.js) | Validates proposed price bounds, allowed markdown limit, and non-negative integer demand. |
| `checkEligibility()` | [`src/domain/eligibility.js`](./src/domain/eligibility.js) | Central food safety gate evaluating expiry flags, ISO timestamps, damage condition, and cold chain exceptions. |
| `calculateUnitContribution()` | [`src/domain/economics.js`](./src/domain/economics.js) | Computes $P - C$ rounded to 2 decimal places in INR. |
| `calculateTotalContribution()` | [`src/domain/economics.js`](./src/domain/economics.js) | Computes $\text{Unit} \times Q_{\text{alloc}}$ strictly for allocated units. |
| `calculateDiscountPercent()` | [`src/domain/economics.js`](./src/domain/economics.js) | Computes $((P_{\text{orig}} - P_{\text{prop}}) / P_{\text{orig}}) \times 100$. |
| `checkAllowedMarkdownLimit()` | [`src/domain/economics.js`](./src/domain/economics.js) | Validates proposed price against allowed markdown percentage cap. |
| `checkMinimumContribution()` | [`src/domain/economics.js`](./src/domain/economics.js) | Validates $P \ge C$ and optional store margin floor thresholds. |
| `allocateStock()` | [`src/domain/allocation.js`](./src/domain/allocation.js) | Computes bounded allocation $\min(Q, D)$ and unsold stock $Q - Q_{\text{alloc}}$. |
| `generateRecommendation()` | [`src/domain/recommendations.js`](./src/domain/recommendations.js) | Integrates all sub-engines into structured recommendation with plain-language explanation. |

---

## 5. Automated Test Results

### Command Executed:
```powershell
npm test
```

### Output Summary:
- **Total Test Suites:** 37
- **Total Tests Executed:** 91
- **Passed:** 91
- **Failed:** 0
- **Duration:** 146.5 ms

### Focused Module 3 Tests Breakdown ([`src/tests/simulator.test.js`](./src/tests/simulator.test.js)):
1. `accepts valid markdown within permitted range`: **PASS**
2. `accepts zero markdown (selling at full original price)`: **PASS**
3. `accepts maximum permitted markdown price boundary`: **PASS**
4. `rejects proposed price exceeding maximum allowed markdown`: **PASS**
5. `rejects proposed price exceeding original selling price`: **PASS**
6. `rejects negative proposed prices`: **PASS**
7. `enforces 2-decimal INR currency rounding`: **PASS**
8. `caps allocation when supported demand is lower than available stock (8 demand < 10 stock)`: **PASS**
9. `caps allocation when supported demand is greater than available stock (15 demand > 10 stock)`: **PASS**
10. `handles confirmed zero demand properly (0 units allocated, all stock unsold)`: **PASS**
11. `handles missing or unevidenced demand safely without fabricating sales`: **PASS**
12. `guarantees allocated quantity never exceeds available eligible stock`: **PASS**
13. `calculates correct unit and total contribution for allocated units`: **PASS**
14. `satisfies minimum contribution policy when unit contribution is above floor`: **PASS**
15. `flags violation when unit contribution is below store policy floor`: **PASS**
16. `hard-blocks expired batch B2 from sale even with attractive margin (+₹30)`: **PASS**
17. `hard-blocks damaged stock B3 from recovery sale`: **PASS**
18. `flags cold-chain exception B4 for manager review and blocks sale`: **PASS**
19. `guarantees input batch object is never mutated during simulation`: **PASS**

---

## 6. Verification of the 3 Mandatory Business Case Checks

Executed via [`src/domain/caseChecksRunner.js`](./src/domain/caseChecksRunner.js):

1. **Check 1 — Contribution Calculation (10 Points):**  
   10 units sold @ ₹40 with ₹25 incremental cost $\rightarrow$ Unit Contribution = ₹15, Total Contribution = ₹150. **[PASS: 10/10 pts]**
2. **Check 2 — Expired Stock Blocked (10 Points):**  
   Batch B2 (`expired: true`, ₹50 price, ₹20 cost, margin +₹30) $\rightarrow$ Sellable quantity forced to 0, allocated quantity 0, approved contribution ₹0. **[PASS: 10/10 pts]**
3. **Check 3 — Demand Cap & Visible Unsold Stock (5 Points):**  
   - 8 avail vs 12 demand $\rightarrow$ 8 allocated, 0 unsold, 4 unmet demand.  
   - 12 avail vs 8 demand $\rightarrow$ 8 allocated, **4 unsold units visibly accounted for**, 0 unmet demand. **[PASS: 5/5 pts]**

**Total Case Checks Score:** **25 / 25 Points (100% Verified Compliant)**

---

## 7. Production Build Verification

### Command Executed:
```powershell
npm run build
```

### Result:
```
vite v8.3.4 building client environment for production...
transforming...
✓ 1944 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.84 kB │ gzip:  0.54 kB
dist/assets/index-ItZXqjYD.css   44.92 kB │ gzip:  8.14 kB
dist/assets/index-9pLcuD1v.js   355.81 kB │ gzip: 98.62 kB
✓ built in 440ms
```
Zero build errors or warnings.

---

## 8. Browser Verification Evidence

Verified using autonomous browser subagent session (`verify_module3_simulator_1792243824892.webp`):
1. **Batch Navigation:** Selected batch from Inventory $\rightarrow$ opened details modal $\rightarrow$ clicked `"Open Markdown Simulator"` $\rightarrow$ simulator opened with that batch loaded.
2. **Live Calculation:** Changed price to ₹35 $\rightarrow$ unit contribution, discount %, allocated quantity, revenue, cost, and contribution updated live.
3. **Validation Error Display:** Entered price violating markdown limit $\rightarrow$ non-clamping validation warning displayed with rejection explanation.
4. **Reset Action:** Clicked `"Reset to Starting Values"` $\rightarrow$ restored original price and demand.
5. **Demand Scenarios:** Selected `"Zero Demand"` $\rightarrow$ 0 allocated, all stock unsold; selected `"Fixture Assumption"` $\rightarrow$ 10 units allocated.
6. **Safety Hard-Stop:** Selected expired batch `B-0005` $\rightarrow$ red safety banner appeared, sliders locked, sellable qty was 0.
7. **Back Navigation:** Clicked `"Back to Inventory"` $\rightarrow$ cleanly returned to Inventory list.

---

## 9. Module 3 Acceptance Checklist

- [x] **The simulator opens for the correct selected batch.** (Verified: batch ID and data persist from inventory into simulator) — **PASS**
- [x] **Starting values come from the official data.** (Verified: original price, cost, quantity, and demand assumption match fixture) — **PASS**
- [x] **Markdown input respects verified limits.** (Verified: checks maximum allowed markdown and rejects out-of-bounds values) — **PASS**
- [x] **Demand input or scenario selection works.** (Verified: Fixture, High, Zero, and Missing demand scenarios work dynamically) — **PASS**
- [x] **The shared domain engine calculates the outcome.** (Verified: zero duplicated formulas; all calculations invoke `src/domain/`) — **PASS**
- [x] **Contribution and allocation are correct.** (Verified: unit contribution = $P - C$, total = $\text{Unit} \times Q_{\text{alloc}}$) — **PASS**
- [x] **Demand is capped by available eligible stock.** (Verified: $Q_{\text{alloc}} = \min(Q_{\text{eligible}}, D)$) — **PASS**
- [x] **Unsold stock is visible.** (Verified: unsold units strictly accounted for in amber stat card) — **PASS**
- [x] **Minimum-contribution failures are explained.** (Verified: policy floor checks explain margin deficits) — **PASS**
- [x] **Expired and otherwise prohibited stock cannot be approved for sale.** (Verified: hard-stop banner locks controls and forces sellable quantity to 0) — **PASS**
- [x] **Missing demand evidence is handled honestly.** (Verified: missing demand flags explicit warning and holds allocation at 0) — **PASS**
- [x] **Inputs recalculate correctly without stale results.** (Verified: memoized evaluation guarantees instant recalculation on any change) — **PASS**
- [x] **Reset and back navigation work.** (Verified: `"Reset to Starting Values"` and `"Back to Inventory"` work smoothly) — **PASS**
- [x] **The simulation does not mutate actual inventory or create permanent decisions.** (Verified: immutable inputs; zero mutations to source batches) — **PASS**
- [x] **New tests pass.** (Verified: 19 new simulator engine tests pass) — **PASS**
- [x] **All existing tests pass.** (Verified: 91/91 total tests pass) — **PASS**
- [x] **The production build succeeds.** (Verified: `npm run build` succeeds in 440ms) — **PASS**
- [x] **The fixture is unchanged.** (Verified: `Starter_Data/C30/fixture.json` remains pristine) — **PASS**
- [x] **The completion report contains evidence for each criterion.** (Verified: documented in `MODULE_3_COMPLETION_REPORT.md`) — **PASS**

---

## 10. Stop Condition

Module 3 is **COMPLETE**. All acceptance criteria are verified and passing. In accordance with Section 16, stopping here and awaiting user approval before proceeding to subsequent modules.
