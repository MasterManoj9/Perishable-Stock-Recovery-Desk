# MODULE 1 — CORE DECISION ENGINE AND AUTOMATED TESTS COMPLETION REPORT

**Project:** FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk  
**Module:** Module 1 — Core Decision Engine and Automated Tests  
**Date:** October 17, 2026  
**Status:** COMPLETE — ALL TESTS PASSING (46/46 tests passed) — MANDATORY MODULE GATE REACHED

---

## 1. Files Created and Modified

| File Path | Type | Role & Responsibility |
| :--- | :--- | :--- |
| [`Starter_Data/C30/fixture.json`](./Starter_Data/C30/fixture.json) | Data Fixture | Authoritative official fixture preserving exact schema (`B1`, `B2`, `demand_assumption_units`). |
| [`FYND_C30_Project_Requirements.md`](./FYND_C30_Project_Requirements.md) | Documentation | Preserves requirements, constraints, and formulas for project traceability. |
| [`package.json`](./package.json) | Configuration | Node.js ESM configuration with `"test": "node --test src/tests/*.test.js"`. |
| [`src/domain/validation.js`](./src/domain/validation.js) | Domain Logic | Defensive input and batch validation; enforces non-negative integers, valid currency, and `null` semantics. |
| [`src/domain/eligibility.js`](./src/domain/eligibility.js) | Domain Logic | Centralized food safety gate; evaluates `expired` flag, ISO timestamps, damaged condition, and cold-chain exceptions. |
| [`src/domain/economics.js`](./src/domain/economics.js) | Domain Logic | Financial contribution ($P - C$), total contribution ($\text{Unit} \times Q_{\text{alloc}}$), markdown limits, and minimum margin policies. |
| [`src/domain/allocation.js`](./src/domain/allocation.js) | Domain Logic | Demand-capped allocation ($\min(Q, D)$), unsold stock ($Q - Q_{\text{alloc}}$), unmet demand, and unknown-demand handling. |
| [`src/domain/recommendations.js`](./src/domain/recommendations.js) | Domain Logic | Orchestrates validation, safety gates, economics, and allocation into structured recommendation records. |
| [`src/domain/caseChecksRunner.js`](./src/domain/caseChecksRunner.js) | Domain / Test Engine | Single source of truth executing the 3 mandatory judging checks in exact printed order. |
| [`src/tests/caseChecks.test.js`](./src/tests/caseChecks.test.js) | Test Suite | Automated test suite verifying the 3 mandatory case checks in exact printed order. |
| [`src/tests/validation.test.js`](./src/tests/validation.test.js) | Test Suite | Boundary and type validation tests for batch fields and simulation parameters. |
| [`src/tests/eligibility.test.js`](./src/tests/eligibility.test.js) | Test Suite | Food safety gate tests: exact expiry boundary, damaged stock, cold-chain exception, immutability. |
| [`src/tests/economics.test.js`](./src/tests/economics.test.js) | Test Suite | Economics tests: unit contribution, total contribution, discount percentages, rounding, minimum contribution policy. |
| [`src/tests/allocation.test.js`](./src/tests/allocation.test.js) | Test Suite | Demand capping tests (both directions), zero/unknown demand, integrated recommendation tests. |

---

## 2. Business Functions Implemented

1. `isNonNegativeInteger(val)` & `isNonNegativeNumber(val)`: Strict numeric validators rejecting negative numbers, NaN, Infinity, and null.
2. `isValidTimestamp(val)`: ISO-8601 timestamp parser and validator.
3. `validateBatch(batch)`: Normalizes and verifies incoming batch records against schema rules.
4. `validateSimulationParams(params, origPrice, cost, maxMarkdown)`: Validates proposed price (cannot exceed original price, must satisfy allowed markdown limit) and supported demand.
5. `checkEligibility(batch, referenceTime)`: Central food safety gate. Returns `{ eligible, sellableQuantity, status, reason, requiresReview }`. Hard-blocks expired stock, damaged stock, and unresolved cold-chain exceptions.
6. `calculateUnitContribution(sellingPrice, incrementalCost)`: Pure financial calculation: $P_{\text{sell}} - C_{\text{inc}}$ rounded to 2 decimal places in INR.
7. `calculateTotalContribution(unitContribution, allocatedQuantity)`: Computes contribution strictly for allocated units.
8. `calculateDiscountPercent(originalPrice, proposedPrice)`: Derives discount percentage.
9. `checkAllowedMarkdownLimit(originalPrice, proposedPrice, maxMarkdownPercent)`: Enforces store markdown caps.
10. `checkMinimumContribution(unitContribution, policy)`: Enforces positive unit contribution ($P \ge C$) and optional store floors.
11. `allocateStock(availableStock, supportedDemand)`: Computes bounded allocation: $Q_{\text{alloc}} = \min(Q, D)$, $Q_{\text{unsold}} = Q - Q_{\text{alloc}}$, $D_{\text{unmet}} = \max(0, D - Q_{\text{alloc}})$. Distinguishes confirmed 0 demand from missing/unknown demand.
12. `generateRecommendation(batch, simulationParams, options)`: Combines all domain rules into an auditable recommendation.
13. `runMandatoryCaseChecks(fixtureData)`: Reusable runner for the 3 official judging checks in exact printed order.

---

## 3. Actual Rules Derived from the Official Fixture

- `case_id`: `"C30"`, `synthetic`: `true`.
- `currency`: `"INR unless explicitly stated"` $\rightarrow$ All monetary outputs formatted consistently in ₹.
- `missing_values`: `"null means unknown, never zero"` $\rightarrow$ Implemented in `validation.js` and `allocation.js`. Missing demand is never assumed to be 0 or fabricated; it is flagged as `UNKNOWN_OR_MISSING` and yields 0 allocation until explicitly confirmed.
- `expected_B1_contribution_inr`: `150` $\rightarrow$ Reconciles with $10 \text{ units} \times (₹40 - ₹25) = ₹150$.
- `expired`: `true` on `B2` $\rightarrow$ Even with apparent margin of $+₹30$ ($₹50 - ₹20$), sellable quantity is forced to `0`, allocated quantity is `0`, approved contribution is `0`, and sale is blocked.

---

## 4. Unresolved Assumptions or Blockers

- **Zero Blockers:** All domain contracts are satisfied and proven with automated tests.
- **Configurable Store Margin:** In accordance with Section 7, the minimum contribution policy is isolated behind `checkMinimumContribution` with a default floor of $P \ge C$ (non-negative contribution), allowing configurable thresholds without modifying core calculation code.

---

## 5. Exact Commands Executed & Verification Results

### Test Execution Command
```powershell
npm test
```

### Test Results Summary
- **Total Test Suites:** 22
- **Total Tests Executed:** 46
- **Passed:** 46
- **Failed:** 0
- **Skipped / Cancelled:** 0
- **Duration:** 111.8 ms

---

## 6. Mandatory Case-Check Outputs (In Exact Printed Order)

The 3 mandatory judging checks were executed via `runMandatoryCaseChecks()`:

```json
[
  {
    "id": "CASE_CHECK_1",
    "order": 1,
    "points": 10,
    "title": "Contribution Calculation (₹150 Expected)",
    "description": "10 units sold at ₹40 with incremental cost of ₹25 each must yield ₹15/unit and ₹150 total.",
    "input": {
      "qtySold": 10,
      "sellingPrice": 40,
      "incrementalCost": 25
    },
    "expected": {
      "unitContribution": 15,
      "totalContribution": 150
    },
    "actual": {
      "unitContribution": 15,
      "totalContribution": 150
    },
    "passed": true,
    "explanation": "PASS: 10 units × (₹40 − ₹25) = 10 × ₹15 = ₹150 exactly."
  },
  {
    "id": "CASE_CHECK_2",
    "order": 2,
    "points": 10,
    "title": "Expired Batch Blocked from Sale",
    "description": "An expired batch must not be sellable even if proposed price yields an attractive margin (+₹30).",
    "input": {
      "batchId": "B2",
      "qty": 20,
      "salePrice": 50,
      "cost": 20,
      "apparentMargin": 30,
      "expired": true
    },
    "expected": {
      "eligible": false,
      "sellableQuantity": 0,
      "allocatedQuantity": 0,
      "approvedContribution": 0,
      "recommendedAction": "BLOCK_SALE_DISPOSAL",
      "reasonRequired": true
    },
    "actual": {
      "eligible": false,
      "sellableQuantity": 0,
      "allocatedQuantity": 0,
      "approvedContribution": 0,
      "recommendedAction": "BLOCK_SALE_DISPOSAL",
      "reason": "Batch has reached or passed its expiry boundary. Strictly blocked from sale under food-safety regulations."
    },
    "passed": true,
    "explanation": "PASS: Expired batch B2 strictly blocked. Sellable qty: 0, allocated: 0, contribution: ₹0. Reason: \"Batch has reached or passed its expiry boundary. Strictly blocked from sale under food-safety regulations.\""
  },
  {
    "id": "CASE_CHECK_3",
    "order": 3,
    "points": 5,
    "title": "Demand Capped & Unsold Stock Visible",
    "description": "Demand above available stock is capped; demand below available stock leaves unsold units visible.",
    "input": {
      "scenarioA": {
        "availableStock": 8,
        "supportedDemand": 12
      },
      "scenarioB": {
        "availableStock": 12,
        "supportedDemand": 8
      }
    },
    "expected": {
      "scenarioA": {
        "allocated": 8,
        "unsold": 0,
        "unmetDemand": 4
      },
      "scenarioB": {
        "allocated": 8,
        "unsold": 4,
        "unmetDemand": 0
      }
    },
    "actual": {
      "scenarioA": {
        "allocated": 8,
        "unsold": 0,
        "unmetDemand": 4
      },
      "scenarioB": {
        "allocated": 8,
        "unsold": 4,
        "unmetDemand": 0
      }
    },
    "passed": true,
    "explanation": "PASS: 8 vs 12 capped at 8 (4 unmet). 12 vs 8 allocated 8 (4 unsold units visible)."
  }
]
```

---

## 7. Module 1 Acceptance Checklist

| Acceptance Criterion | Status | Concrete Evidence |
| :--- | :---: | :--- |
| **Existing working code preserved** | **PASS** | `MODULE_0_INSPECTION_REPORT.md` and initial workspace preserved intact. |
| **Actual fixture fields and rules mapped** | **PASS** | `B1`, `B2`, `qty`, `sale_price_inr`, `incremental_cost_inr`, `expired` mapped in `src/domain/`. |
| **Input validation implemented** | **PASS** | `src/domain/validation.js` verified with 15 dedicated unit tests in `src/tests/validation.test.js`. |
| **Eligibility checks centralized** | **PASS** | `src/domain/eligibility.js` implements `checkEligibility` used uniformly. |
| **Expiry boundary behavior deterministic and tested** | **PASS** | Injectable `referenceTime` tested before, exactly at, and after boundary in `src/tests/eligibility.test.js`. |
| **Damaged stock blocked under applicable rules** | **PASS** | Tested in `src/tests/eligibility.test.js`: sellable quantity forced to 0 with explicit explanation. |
| **Cold-chain exceptions blocked / held for review** | **PASS** | Tested in `src/tests/eligibility.test.js`: returns `COLD_CHAIN_REVIEW` status and blocks sale. |
| **Allowed markdown constraints enforced** | **PASS** | Tested in `src/tests/economics.test.js` and `src/tests/validation.test.js`. |
| **Minimum contribution rules enforced** | **PASS** | Tested in `src/tests/economics.test.js`: selling below incremental cost rejected. |
| **Demand allocation capped correctly** | **PASS** | Tested in `src/tests/allocation.test.js` ($8 \text{ vs } 12 \rightarrow 8$). |
| **Unsold quantity correct and visible** | **PASS** | Tested in `src/tests/allocation.test.js` ($12 \text{ vs } 8 \rightarrow 4 \text{ unsold visible}$). |
| **Missing demand evidence handled explicitly** | **PASS** | Null demand yields `UNKNOWN_OR_MISSING` status and 0 allocation. |
| **The ₹150 contribution case passes** | **PASS** | Case Check 1 PASSED ($10 \times ₹15 = ₹150$). |
| **The expired-stock case passes** | **PASS** | Case Check 2 PASSED (Batch `B2` blocked, 0 units, 0 contribution). |
| **The demand-cap case passes** | **PASS** | Case Check 3 PASSED (Part A and Part B verified). |
| **Additional relevant edge-case tests pass** | **PASS** | 46 total tests passing across all domain edge cases. |
| **All tests and build verified** | **PASS** | `npm test` exit code 0; all suites green. |
| **Diff contains no unrelated or destructive changes** | **PASS** | Only pure domain logic, tests, and authoritative fixture created. |
| **Module completion report produced** | **PASS** | Written to [`MODULE_1_COMPLETION_REPORT.md`](./MODULE_1_COMPLETION_REPORT.md). |

---

### MANDATORY MODULE GATE: STOPPING HERE

Module 1 is 100% complete. All 3 mandatory case checks and 46 automated domain tests pass with zero errors.

In strict adherence to the module-by-module workflow, we STOP here. No UI screens have been built.

**Awaiting your review and explicit approval to proceed to Module 2 (App Shell, Executive Dashboard & Batch Inventory Table with Eligibility Tags).**
