# MODULE 5 — BUSINESS FEEDBACK EVIDENCE: EXPIRY & SAFETY PRECEDENCE OVER MARGIN

**Project:** FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk  
**Document:** Negotiated Change Verification & Evidence  
**Status:** VERIFIED & PASS  
**Timestamp:** 2026-10-17T21:10:00.000Z  

---

## 1. Starting State (Before Change)

### Context & Code Inspection:
In early retail prototypes or naive inventory clearance calculators, economic evaluation algorithms frequently calculate markdowns and potential profit contributions based purely on:
$$\text{Unit Margin} = \text{Selling Price} - \text{Incremental Cost}$$
$$\text{Total Recovery} = \text{Unit Margin} \times \text{Demand}$$

Under this unconstrained calculation, an expired batch like **Batch B2** in the official fixture (`Starter_Data/C30/fixture.json`):
- Starting quantity: 20 units
- Sale price: ₹50
- Incremental cost: ₹20
- Supported demand: 10 units
- Theoretical contribution: $10 \times (₹50 - ₹20) = +₹300$

If pricing and demand are evaluated before or in isolation from food safety, a user interface could display a green "Approved Recovery" or suggest that ₹300 of contribution can be realized, creating a severe public health violation and regulatory breach.

### Evidence from Initial Inspection:
As documented in `MODULE_0_INSPECTION_REPORT.md` (Finding 2), Case Check 2 strictly requires:
> *"Expired batches are not sellable even if the margin looks attractive. Expected: action blocked, sellable quantity zero, and a clear reason."*

---

## 2. Negotiated Change

### Requirement:
**Check expiry and safety eligibility before presenting a financially attractive markdown or recovery result as an acceptable recommendation.**

### Architectural Rule:
1. **Centralized Domain Enforcement:** Food-safety gates must be executed first within the pure domain logic (`src/domain/eligibility.js` and `src/domain/recommendations.js`), rather than relying on ad-hoc UI guards.
2. **Zero Sellable Allocation:** When stock fails food-safety eligibility (expired, damaged, or unresolved cold-chain exception), `sellableQuantity` is forced to `0`. Consequently, `allocatedQuantity = min(0, demand) = 0`.
3. **Contribution Zeroed Out:** Approved recovery contribution is strictly forced to `₹0` (`allocatedQuantity × margin = 0 × margin = ₹0`).
4. **Separation of Theoretical Calculations:** If a potential unit margin is calculated for mathematical transparency (e.g. `₹50 - ₹20 = +₹30`), it must be explicitly separated and labeled as an **Unapproved Theoretical Margin**, accompanied by an explicit rejection alert:
   > *"Under food-safety regulations, economic attractiveness never overrides expiry or safety restrictions."*
5. **Action Categorization:** The system recommendation must never be `RECOMMEND_MARKDOWN_SALE`. It must be `BLOCK_SALE_DISPOSAL` (for expired/damaged stock) or `BLOCK_SALE_REVIEW` (for cold-chain exceptions).
6. **Persistence Safety Invariant:** `validateDecisionRecord` must reject any attempt to save an expired or safety-blocked scenario as an approved markdown sale. Blocked stock may only be committed as a quarantine or disposal audit entry.

---

## 3. Final Implemented Behavior

### Step-by-Step Execution Journey:

1. **Inventory View (`src/features/inventory/`):**
   - Batch B2 displays an unambiguous red status badge: `Blocked: Expired`.
   - Sellable quantity displays as `0 units` (with `20 units` physical stock quarantined).
2. **Markdown Simulator (`src/features/simulator/SimulatorPage.jsx`):**
   - **Safety Hard-Stop Banner:** Prominently rendered at the top of the controls:
     `FOOD SAFETY HARD-STOP: SALE STRICTLY PROHIBITED`  
     `Blocking Reason: Batch B2 has reached or passed its expiry boundary. Strictly blocked from sale under food-safety regulations.`
   - **Controls Lockdown:** Price slider is disabled.
   - **Outcome Summary:** Total Projected Contribution displays `₹0` (`0 units sold × ₹0 unit contribution`).
   - **Unapproved Theoretical Margin Notice:** Rendered in an amber alert box:
     `Unapproved Theoretical Margin: This scenario would yield a theoretical margin of +₹30/unit, but cannot be approved. Under food-safety regulations, economic attractiveness never overrides expiry or safety restrictions.`
   - **Stock Balance:** Projected sold is `0 units`; unsold stock is `20 units` visibly accounted for.
   - **Action Button:** The standard "Commit Markdown Decision" is replaced with:
     `Record Quarantine Action` (styled in red/rose).
3. **Audit Confirmation Modal (`DecisionConfirmModal.jsx`):**
   - Shows `Blocked` status badge and `Action: BLOCK_SALE_DISPOSAL`.
   - Confirms `0 units` allocated for sale and `₹0` recovery contribution.
4. **Decision Persistence (`src/data/decisionStore.js`):**
   - Record created with `decisionStatus: 'BLOCKED_DISPOSAL'`, `allocatedQuantity: 0`, `totalContribution: 0`.
   - If an external caller attempts to force `decisionStatus: 'APPROVED_MARKDOWN'`, `validateDecisionRecord` throws `SAFETY_VIOLATION_APPROVED_SALE`.
5. **Decisions History (`src/features/decisions/DecisionsPage.jsx`):**
   - Displays record with `Blocked: Disposal` rose alert badge.
   - Sold units: `0 units`, Unsold: `20 units`, Contribution: `₹0`.

---

## 4. Verification Evidence

### Automated Test Coverage:
All 136 tests pass across 50 suites, including dedicated tests in `src/tests/reliabilityEdgeCases.test.js` and `src/tests/simulator.test.js`.

| Test Description | File Reference | Expected Result | Actual Result |
|---|---|---|---|
| Expired batch B2 with +₹30 margin | `src/tests/reliabilityEdgeCases.test.js:150` | `eligible: false`, `allocatedQuantity: 0`, `totalContribution: 0`, `recommendedAction: BLOCK_SALE_DISPOSAL` | PASS |
| Explanatory potential margin separated | `src/tests/reliabilityEdgeCases.test.js:168` | `rec.potentialUnitMargin: 30`, `explanation.includes('Attractive margins cannot bypass food safety')` | PASS |
| Safety gate prevents saving expired batch as approved sale | `src/tests/reliabilityEdgeCases.test.js:175` | `validateDecisionRecord` fails with `SAFETY_VIOLATION_APPROVED_SALE` | PASS |
| Exact boundary expiry test | `src/tests/reliabilityEdgeCases.test.js:88` | `refMs === expiryMs` -> `eligible: false`, `status: EXPIRED` | PASS |
| Cold-chain exception override rejection | `src/tests/reliabilityEdgeCases.test.js:235` | `cold_chain_status: 'exception'` -> `allocatedQuantity: 0`, `totalContribution: 0` | PASS |
| Damaged stock override rejection | `src/tests/reliabilityEdgeCases.test.js:260` | `condition: 'damaged'` -> `sellableQuantity: 0`, `status: DAMAGED` | PASS |

---

## 5. Remaining Limitations & Clarifications

1. **Synthetic Teaching Fixture:** The evaluation relies on fixture `Starter_Data/C30/fixture.json`. No live customer purchase data or real-store point-of-sale integration is claimed.
2. **Boundary Semantics:** As implemented, `referenceTime >= expiryTimestamp` is treated as expired (inclusive boundary: the moment the expiration timestamp arrives, the batch is no longer sellable).
3. **Local Storage Audit Scope:** Persistence uses browser `localStorage`. While robust against malformed data and browser refreshes, it is a single-client prototype and not an enterprise multi-tenant database.
