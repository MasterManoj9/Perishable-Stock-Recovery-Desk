# EVIDENCE AND ASSUMPTIONS REGISTER
**FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk**
**Document Type:** Epistemic Evidence Audit & Claims Verification Register  
**Version:** 1.0.0  
**Audit Date:** October 17, 2026  
**Auditor:** Senior Software Engineer, QA Lead & MBA Presentation Advisor  

---

## 1. Epistemic Classification Taxonomy

To ensure absolute academic and commercial honesty, every assertion in this project is classified into one of five mutually exclusive evidentiary tiers:

1. **Observed Fact:** Ground truth verified directly through local tool execution, code inspection, Git logs, or system runtime output.
2. **Fixture-Derived Result:** Deterministic output calculated from the synthetic test data provided in `Starter_Data/C30/fixture.json`.
3. **Mathematical Calculation:** Pure deductive arithmetic or algorithmic derivation from explicitly stated assumptions or formulas.
4. **External Evidence:** Third-party industry research, published retail benchmarks, or standard legal/regulatory codes (e.g., FSSAI).
5. **Assumption / Hypothesis:** Unproven premise, market conjecture, or pre-pilot commercial estimate that requires empirical validation.

---

## 2. Comprehensive Evidence & Assumptions Matrix

| # | Project Claim | Epistemic Classification | Source / Calculation Method | Verification Status | Next Validation Step |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Selling 10 units of Batch B1 at ₹40 with ₹25 incremental cost yields ₹150 contribution. | **Fixture-Derived Result & Calculation** | Formula: $(40 - 25) \times 10 = 150$. Executed on synthetic fixture batch `B1`. | **VERIFIED (PASS)** via `src/tests/caseChecks.test.js`. | Confirmed in automated test suite. |
| **2** | Expired Batch B2 is blocked from sale even though its theoretical margin is +₹30. | **Fixture-Derived Result & Calculation** | Evaluated via `checkEligibility(B2)`. Returns `eligible: false`, `sellableQuantity: 0`. | **VERIFIED (PASS)** via `src/tests/caseChecks.test.js`. | Confirmed in automated test suite. |
| **3** | Supported demand above available stock is capped at available stock, and unsold stock remains visible. | **Calculation & Algorithmic Rule** | Formula: $Q_{\text{alloc}} = \min(Q, D)$; $Q_{\text{unsold}} = Q - Q_{\text{alloc}}$. | **VERIFIED (PASS)** via `src/tests/allocation.test.js`. | Confirmed in automated test suite. |
| **4** | The application code runs in Node.js v22 with 136 automated tests passing in ~190ms. | **Observed Fact** | Terminal execution of `npm test` on host system (`f:\FYND X GENESIS`). | **VERIFIED (PASS)** (136/136 tests pass). | Continual CI/test execution. |
| **5** | The production bundle builds cleanly in <500ms using Vite. | **Observed Fact** | Terminal execution of `npm run build`; generates `dist/index.html` and assets. | **VERIFIED (PASS)** (422ms build time). | Verify deployment preview. |
| **6** | The official fixture `Starter_Data/C30/fixture.json` has remained completely unmodified. | **Observed Fact** | Git inspection: `git diff Starter_Data/` returns zero changes. | **VERIFIED (PASS)**. | Maintain strict Git tracking. |
| **7** | Café managers can reduce perishable waste by 25% using this tool. | **Assumption / Hypothesis** | Working hypothesis based on structured decision timing; unvalidated in live retail. | **UNVERIFIED (HYPOTHESIS)**. | Execute 5-day field trial per `SUPERVISED_PILOT_PLAN.md`. |
| **8** | Specialty cafés experience 8% to 18% daily spoilage on fresh morning bakery batches. | **External Evidence & Assumption** | Aggregated Indian food service benchmarks (National Restaurant Association of India reports). | **PROVISIONAL (EXTERNAL BENCHMARK)**. | Measure pre-pilot historicals during Phase 1 of pilot. |
| **9** | Café owners will pay ₹999/month for a single-counter subscription. | **Assumption / Hypothesis** | Value-based pricing model assuming recovery of $\ge ₹2,500/\text{month}$ in lost food cost. | **UNVERIFIED (COMMERCIAL HYPOTHESIS)**. | Conduct discovery interviews per `FIRST_CUSTOMER_EXPERIMENT.md`. |
| **10** | Monthly variable cost-to-serve per active store is ~₹199. | **Mathematical Calculation & Assumption** | Sum of estimated CDN hosting (₹15), DB storage (₹40), 15-min support (₹120), payment gateway (₹24). | **ESTIMATED MODEL**. | Reconcile with actual cloud vendor invoices after 5 live stores. |
| **11** | Customer Acquisition Cost (CAC) will average ₹2,000 via localized founder outreach. | **Assumption / Hypothesis** | Assumes 10% conversion from 20 in-person café visits with ₹4,000 total travel/collateral spend. | **UNVERIFIED (PROPOSED ESTIMATE)**. | Track actual hours and travel receipts during first 10 visits. |
| **12** | Local browser storage (`localStorage`) is sufficient for pilot decision persistence. | **Observed Fact & Technical Limit** | Verified client-side persistence in `src/data/decisionStore.js`; handles quota & JSON corruption. | **VERIFIED (PROTOTYPE SCOPE)**. | Migrate to cloud Postgres/Supabase for multi-device enterprise scale. |
| **13** | Any real customer has tested or purchased this software. | **Negative Fact (Explicit Non-Claim)** | Zero commercial contracts or live store pilots have been conducted to date. | **CONFIRMED FALSE (ZERO PRIOR OUTREACH)**. | Execute planned outreach post-event. |

---

## 3. Strict Boundary Rules on Synthetic Data

1. **Synthetic Fixture Non-Conflation:** Synthetic fixture data (Batches `B1`, `B2`, etc.) demonstrates **algorithmic correctness, safety gating, and user interface responsiveness**. It must **never** be cited as evidence of commercial viability, user adoption, or verified revenue lift.
2. **Separation of Explanatory vs. Approved Economics:** The system calculates theoretical margins (e.g., +₹30 on expired Batch `B2`) solely for audit and transparency reasons. These calculations are explicitly segregated from approved recommendations and cannot be used to justify a sale.
3. **No Fabricated Demand:** The decision engine never invents demand assumptions. Where demand evidence is absent, allocated sales are held strictly at 0 units until evidenced.
