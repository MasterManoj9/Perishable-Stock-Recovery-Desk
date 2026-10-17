# MODULE 0 — PROJECT DISCOVERY, REQUIREMENTS VALIDATION & TECHNICAL FOUNDATION REPORT

**Project:** FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk  
**Event:** Product and Business Simulation (19-Hour Timebox)  
**Date of Audit:** October 17, 2026  
**Auditor / Lead Architect:** Senior Full-Stack Lead & Technical Evaluator  
**Status:** MODULE 0 COMPLETE — GATE REACHED (Awaiting approval for Module 1)

---

## A. Executive Summary

### Repository Readiness Assessment
The current working environment (`f:\FYND X GENESIS`) is completely empty and clean. No pre-existing legacy code, conflicting dependencies, broken builds, or uncommitted files exist. 

### Host Environment Health
- **Runtime:** Node.js `v22.13.1` (LTS class)
- **Package Manager:** npm `10.9.2`
- **Version Control:** Git `2.47.1.windows.2`
- **Operating System:** Windows 10/11 (PowerShell)

### Highest Immediate Risks
1. **Document and Fixture Presence on Disk:** The physical files `FYND_C30_Project_Requirements.md` and `Starter_Data/C30/fixture.json` were not present on the filesystem at startup. However, their authoritative contents were provided directly via user input. These must be saved at their authoritative paths before building.
2. **Fixture Schema vs. Extended Domain Ambiguity:** The official fixture provided in `records.batches` contains a minimal schema (`id`, `qty`, `sale_price_inr`, `incremental_cost_inr`, `expired`), while the broader case brief references optional cold-chain status, stock damage condition, and expiry timestamp boundaries. The architecture must strictly support the authoritative fixture while providing clean, extensible normalization for food-safety reliability tests without hardcoding or fabricating ungrounded data.
3. **Evidence Discipline:** The brief strictly prohibits claiming synthetic data as real revenue, customer willingness to pay, or live store reduction. All outputs and UI elements must transparently distinguish scenario estimates from observed facts.

**Conclusion:** The repository is in an ideal greenfield state to be cleanly initialized with the prescribed stack (React + Vite + Tailwind CSS + Lucide React + Vitest) without risk of regression.

---

## B. Repository Inventory

| Item | Status / Findings | Evidence |
| :--- | :--- | :--- |
| **Project Root** | `f:\FYND X GENESIS` | Verified empty directory |
| **Directory Structure** | Empty (0 files, 0 folders) | `Get-ChildItem -Force` returned 0 items |
| **Frontend Framework** | Not yet initialized | No `index.html`, `vite.config.js`, or `src/` |
| **Backend** | None (Prototype requires localStorage) | Aligned with prototype scope |
| **`package.json` & Lockfiles** | None present | Greenfield project |
| **Node.js & npm Version** | Node `v22.13.1`, npm `10.9.2` | Shell command verification |
| **Git Working Tree** | Not initialized as git repository | `git status` returned `fatal: not a git repository` |
| **Uncommitted Changes** | None (no risk of work loss) | Clean state |
| **Predating Build Errors** | None | Clean state |

---

## C. Fixture Audit

The authoritative fixture content provided by the organizers has been audited in detail:

### Raw Fixture Structure
```json
{
  "case_id": "C30",
  "synthetic": true,
  "data_version": "v3.2",
  "currency": "INR unless explicitly stated",
  "missing_values": "null means unknown, never zero",
  "records": {
    "batches": [
      {
        "id": "B1",
        "qty": 10,
        "sale_price_inr": 40,
        "incremental_cost_inr": 25,
        "expired": false
      },
      {
        "id": "B2",
        "qty": 20,
        "sale_price_inr": 50,
        "incremental_cost_inr": 20,
        "expired": true
      }
    ],
    "demand_assumption_units": 10,
    "expected_B1_contribution_inr": 150
  },
  "public_checks": [
    "Ten units sold at 40 with 25 incremental cost each yield 150 contribution.",
    "Expired batches are not sellable even if the margin looks attractive.",
    "Demand above available stock is capped; unsold units stay visible."
  ],
  "limit": "Small teaching fixture for a bounded prototype. Market demand, willingness to pay and production performance remain unproven."
}
```

### Fixture Analysis & Field-Level Audit
1. **Top-Level Metadata:**
   - `case_id`: `"C30"`
   - `synthetic`: `true` (Enforces transparency banner in the application)
   - `data_version`: `"v3.2"`
   - `currency`: `"INR unless explicitly stated"` (All monetary values must be formatted in ₹)
   - `missing_values`: `"null means unknown, never zero"` (Strict normalization contract: do not coerce `null` to `0`)
2. **Records - Batch Items:**
   - **Batch B1:**
     - `id`: `"B1"`
     - `qty`: `10` (integer units on hand)
     - `sale_price_inr`: `40` (₹40 per unit)
     - `incremental_cost_inr`: `25` (₹25 per unit)
     - `expired`: `false` (Eligible for sale)
     - **Calculated Unit Contribution:** $40 - 25 = ₹15$
     - **Calculated Total Contribution:** $10 \times ₹15 = ₹150$ (Reconciles exactly with `expected_B1_contribution_inr: 150`)
   - **Batch B2:**
     - `id`: `"B2"`
     - `qty`: `20` (integer units on hand)
     - `sale_price_inr`: `50`
     - `incremental_cost_inr`: `20`
     - `expired`: `true`
     - **Apparent Margin:** $50 - 20 = ₹30$ (positive margin)
     - **Safety Gate Behavior:** Hard-blocked because `expired === true`. Sellable quantity must be strictly `0`. No sale action permitted.
3. **Demand Assumption:**
   - `demand_assumption_units`: `10`
   - Allocating B1: $\min(10, 10) = 10$ allocated, $0$ unsold.
   - For check 3 tests:
     - Available 8, Demand 12 $\rightarrow$ Allocated 8, Unmet 4.
     - Available 12, Demand 8 $\rightarrow$ Allocated 8, Unsold 4.
4. **Data Contract Reconciliation:**
   - The official fixture uses a boolean `expired: true|false`.
   - The broader requirements mention ISO-8601 expiry timestamps and condition/cold-chain statuses.
   - **Architecture resolution:** The domain model will support both direct boolean `expired` flags and ISO expiry timestamps via a resilient normalizer:
     - If `expired` is boolean `true`, status is `EXPIRED`.
     - If `expiryAt` timestamp is provided, compare `Date.parse(expiryAt) <= currentTime`.
     - If condition is `"damaged"`, mark `DAMAGED_BLOCKED`.
     - If cold chain is `"exception"`, mark `COLD_CHAIN_REVIEW_REQUIRED`.

---

## D. Requirements Traceability Matrix

| Rubric Criterion | Points | Mandated Requirement | Implementation Target | Verification Method |
| :--- | :---: | :--- | :--- | :--- |
| **Working User Journey** | **25** | Inspect stock $\rightarrow$ simulate markdown $\rightarrow$ allocate quantity $\rightarrow$ record action | Full UI workflow across Dashboard, Inventory, Simulator, and Decision History | End-to-end interactive journey test |
| **Case Outcome Checks (in printed order)** | **25** | 1. Contribution: 10 units @ ₹40 with ₹25 cost = ₹150<br>2. Expired stock: B2 blocked, 0 sellable units<br>3. Demand cap: $\min(Q, D)$, unsold visible | Dedicated Case Checks Panel + Pure Vitest tests | `npm test` + UI Case Checks Panel displaying pass/fail badges |
| **Reliability & Failure Handling** | **15** | Negative inputs rejected, cold-chain exception blocked pending review, damaged stock blocked, malformed storage handled gracefully | `validation.js`, `eligibility.js`, defensive storage wrappers | Automated boundary tests + interactive error states |
| **Improvement After Business Feedback** | **15** | Initial state $\rightarrow$ recorded MBA/store feedback $\rightarrow$ negotiated scope $\rightarrow$ implemented feature $\rightarrow$ before/after evidence | Dedicated Feedback & Evolution modal/panel with diff inspection | Visual and documented before/after audit trail |
| **Handoff & Reproducibility** | **10** | Setup documentation, official fixture preserved, JSON/CSV exports, clean git history | `README.md`, export utilities, fixture preservation | Fresh clone & verification run |
| **Individual Technical Contribution** | **10** | Clear modular architecture: pure domain logic decoupled from UI | `src/domain/`, `src/features/`, `src/data/` | Architecture review & test separation |

---

## E. Technology Stack Decision

| Layer | Chosen Tool | Justification & Verification |
| :--- | :--- | :--- |
| **Build Tool & Framework** | Vite + React (JavaScript) | Instant HMR, lightweight, rapid development. Plain JS strictly fulfills the requirement ("JavaScript, not TypeScript"). |
| **Styling** | Tailwind CSS | Utility-first, predictable layout, supports clean typography, crisp borders, and subtle contrast without bloat. |
| **Iconography** | Lucide React | Standard, clean, modern icons (AlertCircle, CheckCircle, ShieldAlert, TrendingDown, DollarSign, RefreshCw). |
| **Domain Engine** | Pure ES Modules (`src/domain/`) | Decoupled from React. Zero UI dependencies. 100% deterministic and testable. |
| **Persistence** | `localStorage` with versioned key (`c30_decisions_v1`) | Satisfies single-browser prototype persistence. Robust error handling for quota/corrupt JSON. |
| **Test Runner** | Vitest | Extremely fast, native Vite integration, compatible with standard assertion libraries. |

---

## F. UI/UX Implementation Direction

As mandated in Section 8 of the prompt, the application will follow a **practical, professional store manager desk** design:

1. **Aesthetic Tone:** Clean, high-legibility, restrained neutral color palette with slate/indigo accents. No gimmicky glassmorphism, distracting glow effects, or heavy background animations.
2. **Key UI Components:**
   - **Safety Banner:** Prominently displays synthetic data warning and current store clock.
   - **Executive Metric Cards:** Total Batches, Eligible Stock, Expired/Blocked Stock, Simulated Contribution at Risk.
   - **Batch Inventory Table:** Clear status chips (`Eligible`, `Expired`, `Damaged`, `Cold-Chain Review`), original price, incremental cost, and demand evidence.
   - **Interactive Markdown Simulator:** Sliders and direct numeric inputs for markdown price (with validation against incremental cost and allowed limits) + demand scenario picker.
   - **Real-Time Outcome Preview:** Instant display of unit contribution, capped allocation, total expected recovery, and visibly accounted unsold units.
   - **Decision Confirmation Dialog:** Explicit modal showing before/after state snapshots before writing to the audit log.
   - **Case Checks Drawer/Page:** Real-time execution of the 3 required case checks in printed order with inputs, expected vs. actual values, and pass/fail badges.
   - **Export Center:** Clean JSON and RFC 4180-compliant escaped CSV downloads.

---

## G. Risk and Ambiguity Register

| Priority | Issue / Ambiguity | Relevant Field / Requirement | Safest Provisional Behavior | Clarification Needed? |
| :---: | :--- | :--- | :--- | :---: |
| **HIGH** | **Expiry Representation** | `records.batches[].expired` (boolean) vs. ISO timestamp `expiryAt` | Support boolean `expired` directly from fixture; if an ISO timestamp is present, evaluate `Date.parse(expiryAt) <= currentTime`. Never allow sale if either indicates expiry. | No — conservative union rule applied. |
| **HIGH** | **Missing Demand Evidence** | Batches without demand scenario data | Do not invent or fabricate high demand. Mark demand as `"Unknown / Not Evidenced"`, allocate 0 by default, and require explicit scenario selection. | No — conservative rule satisfies Section 5.3. |
| **MEDIUM** | **Minimum Contribution Rule** | Economics contract: selling price vs. incremental cost | Strict rule: Selling price $P \ge \text{Incremental Cost } C$. Unit contribution $P - C > 0$. If a store minimum contribution margin is configured (e.g., ₹5/unit), enforce it and flag violations. | Documented as configurable threshold. |
| **MEDIUM** | **Cold-Chain & Damage Fields** | Absent from raw fixture batches B1 & B2 | Add test records in the test suite and fallback fixture with `condition: "damaged"` and `cold_chain: "exception"` to verify reliability and failure handling. | Handled via test suite & fixture normalization. |
| **LOW** | **Storage Quota & Corruption** | `localStorage` parsing | Implement `try/catch` with fallback in-memory state and corrupted-data reset capability. | Architectural defensive measure. |

---

## H. Verification Results

| Command Run | Purpose | Exit Code | Observed Output / Result |
| :--- | :--- | :---: | :--- |
| `Get-ChildItem -Force` | Check existing workspace files/hidden items | 0 | Empty directory. 0 items found. |
| `node -v` | Verify Node.js runtime version | 0 | `v22.13.1` (Valid LTS) |
| `npm -v` | Verify npm package manager version | 0 | `10.9.2` (Valid) |
| `git --version` | Verify git installation | 0 | `git version 2.47.1.windows.2` |
| `git status` | Verify git repository status | 1 | `fatal: not a git repository` (Uninitialized) |

---

## I. Proposed Implementation Sequence

Following the strict module-by-module instructions:

1. **Module 0 Gate (Current):** Report produced, acceptance criteria verified, waiting for explicit user approval.
2. **Module 1 & 2 (App Foundation & Inventory):**
   - Initialize Vite + React project with Tailwind CSS and Lucide React.
   - Create directories: `Starter_Data/C30/fixture.json` and `public/Starter_Data/C30/fixture.json`.
   - Build App Shell, Dashboard metrics, and Batch Inventory table with eligibility tags.
3. **Module 4 (Pure Domain Engine & Mandatory Vitest Tests):**
   - Implement `eligibility.js`, `economics.js`, `allocation.js`, `validation.js`.
   - Implement Vitest suite validating Case Checks 1, 2, and 3 in printed order.
4. **Module 3 (Markdown Simulator & Allocation Engine):**
   - Implement interactive price and demand simulation linked to pure domain calculations.
5. **Module 5 (Decision Recording & Persistence):**
   - Implement confirmation modal, snapshot generator, versioned `localStorage` storage, and decision history.
6. **Module 6 & 7 (Case Checks Panel, Export & Reliability):**
   - Live Case Checks runner in UI; JSON & escaped CSV export; boundary & malformed data tests.
7. **Module 8 (MBA Feedback Loop & Scope Change):**
   - Implement documented feedback change (e.g., minimum margin threshold or cold-chain review action) with before/after evidence.
8. **Module 9 (Deployment, Documentation & Verification):**
   - Build verification, comprehensive README, handoff guide, and demo rehearsal script.

---

## J. Module 0 Acceptance Checklist

- [x] **The project root and current structure have been inspected.** (Verified empty directory `f:\FYND X GENESIS`)
- [x] **Existing code and uncommitted work have been protected.** (Verified no existing files to overwrite or lose)
- [x] **The requirements document has been read or its absence reported.** (Verified: absent on disk, but full text received and ingested via user prompt)
- [x] **The official fixture has been located and audited, or its absence explicitly reported.** (Verified: absent on disk, but authoritative JSON provided and audited in Section C)
- [x] **The actual stack and dependencies have been verified.** (Node `v22.13.1`, npm `10.9.2`, git `2.47.1`)
- [x] **Existing build and test status has been checked where safely possible.** (Verified: clean slate, no failing legacy tests)
- [x] **Requirements have been mapped against the current repository.** (Traceability matrix complete in Section D)
- [x] **Business-rule ambiguities have been documented.** (Ambiguity register complete in Section G)
- [x] **UI/UX direction and architectural principles have been recorded.** (Design guidelines detailed in Section F)
- [x] **The inspection report is complete and evidence-based.** (Written to `MODULE_0_INSPECTION_REPORT.md`)
- [x] **No unapproved application implementation or dependency changes have been made.** (No packages installed, no application screens created)

---

### MANDATORY MODULE GATE: STOPPING HERE

Module 0 inspection and foundation verification are complete. No application screens have been created, no packages have been installed, and no code has been modified.

**Awaiting your explicit approval to proceed to Module 1 & 2 (Scaffolding the baseline project, storing the official fixture, and building the App Shell and Inventory Eligibility display).**
