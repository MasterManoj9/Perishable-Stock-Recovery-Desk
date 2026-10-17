# SUPERVISED MARKDOWN PILOT PLAN
**FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk**
**Document Type:** Single-Store Pilot Protocol & Operational Governance Framework  
**Scope:** 5-Day Supervised Field Pilot in One Partner Café Location  
**Regulatory & Operating Alignment:** FSSAI Food Safety Standards, Retailer Internal SOPs  
**Status:** PROPOSED PROTOCOL (Awaiting First Partner Acquisition from `FIRST_CUSTOMER_EXPERIMENT.md`)  

---

## 1. Pilot Purpose & Guiding Principles

The objective of the **Supervised Markdown Pilot** is to validate in a real-world store environment whether the **Perishable Stock Recovery Desk** can:
1. Enable floor managers to make rapid (<2 minute), economically sound markdown decisions.
2. Recover positive cash contribution on eligible ageing stock without causing operational friction.
3. Enforce **100% adherence to food-safety restrictions** (zero expired or compromised items sold).

### Core Operating Principles:
- **Retailer Authority First:** All markdowns, displays, and customer communication require explicit store manager approval.
- **Safety Non-Negotiable:** Under no circumstance will an expired, spoiled, or cold-chain-compromised item be offered for sale, regardless of theoretical financial contribution.
- **Strict Empirical Integrity:** Simulated numbers will never be conflated with realized sales. Only actual till receipts and physical counts constitute valid pilot evidence.

---

## 2. Phase 1 — Pre-Trial Setup & Governance (Days -3 to 0)

### 2.1 Retailer Approvals & Scope Definition
1. **Written Pilot Agreement:** Signed one-page charter confirming:
   - Trial duration: 5 consecutive operating days (e.g., Wednesday through Sunday).
   - Daily operational window: 4:30 PM to closing (typically 10:00 PM).
   - Participating categories: 3 to 5 perishable fresh SKUs (e.g., Artisan Sourdough Loaf, Baguettes, Butter Croissants, Gourmet Sandwiches).
2. **Exclusion Criteria:** Pre-packaged branded FMCG with long shelf-life (>30 days), custom-ordered cakes, and bulk unportioned raw ingredients are strictly excluded.

### 2.2 Policy & Parameter Baseline Alignment
Before initiating the trial, the pilot supervisor and store manager jointly configure the Recovery Desk settings:
- **Maximum Permitted Markdown Limit:** Capped at 40% (or store's specific brand threshold).
- **Minimum Unit Contribution Floor:** Configured such that $P_{\text{proposed}} - C_{\text{inc}} \ge ₹5.00$ to ensure positive operating cash flow.
- **Cold-Chain Rule:** Dairy-containing sandwiches must be maintained at $\le 4^\circ\text{C}$ continuously. Any refrigerator display reading above $7^\circ\text{C}$ for over 60 minutes triggers immediate quarantine.

### 2.3 Baseline Metric Capture (Pre-Pilot Historicals)
Capture historical data for the selected SKUs over the preceding 2-week period:
- Average daily opening stock ($Q_{\text{open}}$).
- Average daily full-price units sold ($Q_{\text{full}}$).
- Average daily discarded/binned units ($Q_{\text{waste\_baseline}}$).
- Average daily write-off cost ($\text{Waste Cost} = Q_{\text{waste\_baseline}} \times C_{\text{inc}}$).

### 2.4 Governance & Stop Authority
- **Trial Supervisor:** Appointed MBA research engineer on-site daily during decision windows.
- **Store Authority:** Café General Manager / Floor Shift Lead.
- **Immediate Stop Authority:** Both the trial supervisor and the store manager hold **unilateral stop authority**. If any safety ambiguity or customer conflict arises, the pilot is paused immediately.

---

## 3. Phase 2 — Operational Execution During Trial (Days 1 to 5)

Each trial day follows a standardized, reproducible 4-step workflow:

```
[4:30 PM: PHYSICAL AUDIT]
   |--> Step 1: Count physical stock of pilot SKUs; inspect expiry dates & packaging condition.
   |--> Step 2: Record current cold-chain temperature readings from chiller displays.
   |
[4:45 PM: SIMULATION & GATE ENFORCEMENT]
   |--> Step 3: Launch Recovery Desk on store iPad.
   |--> Step 4: Verify Gate 1: Any item past expiry or showing physical defect is tagged QUARANTINE.
   |--> Step 5: Input evening demand estimate based on day-of-week historical traffic.
   |--> Step 6: Test allowed markdown price; verify positive unit contribution ($P - C > 0$).
   |
[5:00 PM: DECISION COMMIT & STORE DISPLAY]
   |--> Step 7: Manager confirms simulation and clicks "Commit Recovery Decision".
   |--> Step 8: Apply special evening "Fresh Daily Bake — Special Selection" display tags.
   |--> Step 9: Till operator applies agreed markdown price at POS.
   |
[10:00 PM (CLOSING): PHYSICAL COUNT & RECONCILIATION]
   |--> Step 10: Count unsold units physically remaining on display.
   |--> Step 11: Cross-verify POS till report for exact units sold at discounted price.
   |--> Step 12: Supervise lawful disposal or food-bank donation of remaining stock.
```

### 3.1 Data Capture Sheet (Daily Observation Record)
Every observation is recorded in the pilot audit log with timestamped receipts:
- `Date` & `Time_Of_Decision`
- `SKU_ID` & `Batch_ID`
- `Physical_Opening_Qty`
- `Batch_Expiry_Timestamp`
- `Cold_Chain_Temperature_Reading`
- `Regular_Retail_Price` ($P_{\text{reg}}$)
- `Incremental_Unit_Cost` ($C_{\text{inc}}$)
- `Proposed_Recovery_Price` ($P_{\text{rec}}$)
- `Simulator_Allocated_Qty` ($Q_{\text{sim\_alloc}}$)
- `Actual_Units_Sold_At_POS` ($Q_{\text{actual\_sold}}$)
- `Actual_Unsold_Units_Physical` ($Q_{\text{actual\_unsold}}$)
- `Disposal_Action` (Composted / Donated / Binned)

---

## 4. Phase 3 — Post-Trial Reconciliation & Measurement

At the conclusion of the 5-day trial, the observed performance is evaluated using empirical accounting formulas:

### 4.1 Measurement Framework & Formulas

$$\text{Gross Realized Revenue} = \sum (Q_{\text{actual\_sold}} \times P_{\text{rec}})$$

$$\text{Actual Incremental Cost} = \sum (Q_{\text{actual\_sold}} \times C_{\text{inc}})$$

$$\text{Realized Net Cash Contribution} = \text{Gross Realized Revenue} - \text{Actual Incremental Cost}$$

$$\text{Spoilage Reduction Rate} = \frac{Q_{\text{waste\_baseline}} - Q_{\text{actual\_binned}}}{Q_{\text{waste\_baseline}}} \times 100\%$$

> [!IMPORTANT]
> **Strict Empirical Distinction:**
> - Unsold units are **not** automatically assumed to be wasted if the retailer repurposes them into breadcrumbs, croutons, or approved staff meals.
> - Projected contribution from the simulator is explicitly compared against realized POS till receipts to measure **Demand Prediction Error**:
>   $$\text{Prediction Variance} = |Q_{\text{sim\_alloc}} - Q_{\text{actual\_sold}}|$$

---

## 5. Proposed Pilot Success Criteria

The following measurable thresholds are **proposed targets** to be agreed with the retail partner before commencing:

| Success Dimension | Proposed Target Threshold | How Measured |
| :--- | :--- | :--- |
| **1. Food-Safety Compliance** | **100% (Zero Breaches)** | Zero expired, damaged, or unverified cold-chain items offered or sold. |
| **2. Cash Contribution Recovery** | **$\ge ₹2,500$ over 5 days** | Cumulative realized net contribution across all pilot SKUs ($P_{\text{rec}} - C_{\text{inc}}$). |
| **3. Spoilage Reduction** | **$\ge 25\%$ reduction** | Reduction in physical units binned compared to historical baseline. |
| **4. Operational Velocity** | **$\le 3$ minutes daily** | Time taken by floor manager to inspect, simulate, and commit decisions. |
| **5. Manager Satisfaction** | **$\ge 4.0 / 5.0$** | Post-pilot Likert survey on usability, trust in formulas, and workflow fit. |

---

## 6. Pilot Stop & Abort Conditions

The pilot must be paused or terminated immediately if any of the following triggers occur:
1. **Safety Trigger:** Any incident where an expired batch is accidentally displayed or sold.
2. **Customer Confusion / Brand Conflict:** Customers express vocal confusion or complain about pricing discrepancies between full-price and discounted batches.
3. **Severe Demand Cannibalization:** Full-price daytime sales of the SKU drop by $>20\%$ due to customers deliberately waiting for evening markdowns.
4. **Data Integrity Failure:** Inability to reconcile physical counts with POS till receipts by $>10\%$.
