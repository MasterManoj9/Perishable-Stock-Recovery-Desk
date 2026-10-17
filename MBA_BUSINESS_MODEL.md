# MBA BUSINESS MODEL & UNIT ECONOMICS
**FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk**
**Document Type:** Business Model Architecture & Unit Economics Hypothesis  
**Academic Alignment:** MBA Product Management & Commercial Feasibility Assignment  
**Status:** PROPOSED HYPOTHESIS (Unvalidated in Live Retail; Grounded in Structural Analysis)  
**Author:** Product & Business Architecture Lead  

---

## 1. Initial Customer Segment Justification

### 1.1 Evaluated Segments
The project brief targets either a **Café** or a **Small Grocery Retailer**. We evaluated both segments against operational volatility, product shelf-life, gross margins, and decision cadence:

| Evaluation Dimension | Café (e.g., Artisanal Bakery / Specialty Coffee) | Small Grocery / Kirana Store | Segment Selection Verdict |
| :--- | :--- | :--- | :--- |
| **Typical Shelf Life** | **24 to 72 hours** (Pastries, croissants, sandwiches, pre-prepped dairy) | **3 to 14 days** (Packaged FMCG, fresh produce, dry provisions) | **Café Priority:** Extremely narrow recovery window mandates intraday decisions. |
| **Gross Margin Profile** | **65% to 80%** on bakery and beverage items | **15% to 25%** on branded FMCG and staples | **Café Priority:** High gross margins leave room for profitable markdowns above incremental costs ($P > C$). |
| **Stock Volatility & Waste** | **8% to 18%** daily spoilage on fresh batches | **2% to 5%** loss rate across broad SKU assortment | **Café Priority:** Concentrated daily financial loss on a few high-value fresh SKUs. |
| **Operational Workflow** | Single-counter or dual-counter manager making afternoon/evening markdown decisions | High-volume cashier scanning barcode items with distributor return arrangements | **Café Priority:** Store managers have operational discretion to apply dynamic markdowns. |
| **Cold-Chain Dependency** | Critical (Milk, cream, cheese, egg preparations) | Mixed (Beverages refrigerated, majority ambient) | **Café Priority:** Food-safety gates (Gate 1) are critical to brand reputation. |

### 1.2 Selection Conclusion
**Primary Initial Target Customer:** **Independent Specialty Cafés and Small Artisanal Bakery-Café Chains** (1 to 5 locations, ₹15L–₹60L annual revenue per counter, selling daily fresh bakery, pre-made sandwiches, and specialty dairy).

---

## 2. Customer Problem & Current Workflow

### 2.1 The Decision Problem
Café store managers face a daily operational dilemma between 3:00 PM and 7:00 PM:
1. Fresh morning batches (e.g., Artisan Sourdough Loaf, Baguettes, Pain au Chocolat, Fresh Dairy Milk) have remaining shelf-lives under 6–12 hours.
2. Full-price retail demand tapers off significantly in the evening.
3. If left at full price, remaining units expire overnight and must be discarded at a **100% loss of cost of goods sold (COGS)**.
4. If discounted too aggressively or without demand evidence, the store cannabilizes full-price sales or loses money on incremental packaging/handling ($P < C$).
5. Most critically, if an expired or temperature-abused item is sold mistakenly, the store risks severe food-safety violations, customer illness, and regulatory penalties.

### 2.2 Current Baseline Handling (Verified Observations vs. Hypotheses)
- **Verified Fact (Operational Reality):** Small food retailers lack dedicated algorithmic pricing engines; enterprise ERPs (SAP, Oracle Retail) are cost-prohibitive (>₹5,00,000/year) and too complex for floor managers.
- **Observed / Grounded Workflow:** Store managers use informal "gut-feel" discount stickers (e.g., "50% off after 8 PM") applied uniformly across all ageing items regardless of batch cost, stock volume, or actual footfall.
- **Unvalidated Hypothesis (To be tested in Pilot):** We hypothesize that between 30% and 50% of discarded perishable café items could be converted into positive cash contribution if managers had a structured 2-minute decision tool before evening service.

---

## 3. Product Value Proposition

The **Perishable Stock Recovery Desk** functions as an **Intelligent Floor Assistant for Margin Recovery & Food Safety Enforcement**:

```
+-----------------------------------------------------------------------------------+
|                        PERISHABLE STOCK RECOVERY DESK                             |
+-----------------------------------------------------------------------------------+
|  1. INVENTORY ATTENTION   -->  Surfaces batches requiring action (<24h to expiry) |
|  2. FOOD SAFETY GATE 1    -->  Hard-blocks expired, damaged, or temperature-breached|
|  3. DEMAND SIMULATOR      -->  Caps sales by realistic demand; keeps unsold visible|
|  4. MARGIN OPTIMIZATION   -->  Enforces P > C and minimum contribution floors    |
|  5. AUDITABLE TRAIL       -->  Saves manager rationale with RFC 4180 CSV export   |
+-----------------------------------------------------------------------------------+
```

### Key Value Drivers:
1. **Zero Food-Safety Risk:** Guaranteed hard-stop preventing sale of expired or damaged stock regardless of tempting profit margins.
2. **Deterministic Economics:** Replaces guesswork with exact contribution formulas:
   $$\text{Total Contribution} = (P_{\text{proposed}} - C_{\text{inc}}) \times \min(Q_{\text{avail}}, D_{\text{est}})$$
3. **Inventory Truth:** Refuses to fabricate demand; unsold stock remains explicitly visible for planned donation or disposal.
4. **Audit Compliance:** Creates an unalterable log of manager recovery actions for owner/accountant review.

> [!CAUTION]
> **Important Non-Claim:** We do **not** claim that this prototype has already achieved waste reduction or proven profit lift in live stores. These value propositions are testable hypotheses for the supervised pilot.

---

## 4. Business Model & Pricing Architecture

### 4.1 Monetization Model: Per-Location SaaS Subscription
A pure Software-as-a-Service (SaaS) recurring model billed per active store counter/location per month.

### 4.2 Proposed Pricing Tiers (Hypothesis for Pilot Validation)

| Tier | Proposed Price (INR) | Target Customer | Scope & Feature Gate |
| :--- | :--- | :--- | :--- |
| **Starter (Single Counter)** | **₹999 / month** (~₹33/day) | Independent single-location café / bakery kiosk | Up to 50 active perishable batches/day, interactive simulator, local browser persistence, CSV audit export. |
| **Professional (Multi-Counter)** | **₹2,499 / month** (~₹83/day) | Busy café (2–3 counters) or small grocery store | Up to 200 batches/day, configurable store contribution floors, multi-staff roles, automated weekly waste summaries. |
| **Enterprise / Chain** | **₹5,999 / month / store** | Regional bakery chains (5+ outlets) | POS integration API, centralized owner dashboard, automated cold-chain IoT ingest, regulatory audit compliance packs. |

### 4.3 Why a Retailer Might Pay (Economic Rationale)
- In a typical specialty café, discarding 5 artisanal loaves (cost ₹20/unit, retail ₹50) and 4 sandwich packs (cost ₹60, retail ₹140) daily results in an inventory loss of $\approx ₹340/\text{day} = ₹10,200/\text{month}$.
- If the Recovery Desk enables the manager to safely recover even **15% to 25%** of that loss via planned markdowns ($\approx ₹1,500\text{--}₹2,500/\text{month}$ net contribution), the ₹999/month subscription delivers a **1.5x to 2.5x immediate ROI**.
- **Likely Retailer Objections:**
  - *"Our staff has no time to enter batch numbers."* $\rightarrow$ Counter: Pre-loaded daily catalog and quick-select presets reduce simulation time to <60 seconds.
  - *"Customers will just wait for markdowns instead of buying full price."* $\rightarrow$ Counter: Controlled allocation limits marked-down units to expected evening footfall; remaining stock is unadvertised.

---

## 5. Cost-to-Serve Analysis

Because the core decision engine runs client-side (SPA) with local/cloud synchronization, the operational cost-to-serve is exceptionally lean:

### 5.1 Variable Costs per Active Location (Monthly Estimates)

| Expense Category | Estimated Monthly Cost per Location (INR) | Basis / Assumption |
| :--- | :--- | :--- |
| **Static Hosting & CDN (Vercel/Netlify)** | ₹15 | Edge distribution of static JS bundle; negligible bandwidth per store (<50 MB/mo). |
| **Cloud Database & Sync (Supabase / DynamoDB)** | ₹40 | ~1,000 decision records/month per location ($<2\text{ MB}$ storage). Free tiers absorb first 100 stores. |
| **Customer Support & SLA** | ₹120 | 15 minutes of WhatsApp/phone support per store per month at ₹400/hr loaded labor cost. |
| **Payment Gateway Fees (Razorpay / Stripe)** | ₹24 | 2% + GST on ₹999 monthly transaction fee. |
| **Total Monthly Variable Cost ($V$)** | **₹199 / location / month** | **Gross Margin on Subscription: ~80.1%** |

### 5.2 Fixed & Onboarding Costs (Amortized)
- **Store Onboarding & Catalog Setup (One-off):** Estimated 1 hour of remote support/video call ($\approx ₹500$). Charged as a one-time onboarding fee of ₹999 or absorbed in an annual upfront plan.
- **Maintenance & Product Engineering:** ₹30,000/month fixed team budget allocated across customer base.

---

## 6. Unit Economics & Contribution Framework

### 6.1 Monthly Contribution Formula per Location
$$\text{Monthly Contribution per Location} = \text{Monthly Revenue } (R) - \text{Variable Cost to Serve } (V)$$
$$\text{Monthly Contribution (Starter Tier)} = ₹999 - ₹199 = \mathbf{₹800 \text{ / location / month}}$$
$$\text{Contribution Margin Ratio} = \frac{₹800}{₹999} = \mathbf{80.08\%}$$

### 6.2 Customer Lifetime Value (LTV) and Payback Hypothesis

| Metric | Modeled Value (Hypothesis) | Analytical Rationale |
| :--- | :--- | :--- |
| **Customer Acquisition Cost (CAC)** | **₹2,000** | Direct localized founder outreach to 20 cafés; 10% conversion = 2 customers per 20 visits; travel/materials ₹4,000. |
| **Monthly Churn Rate** | **5% / month** | Expected average café customer lifespan of 20 months in business. |
| **Customer Lifetime ($1/\text{Churn}$)** | **20 months** | Reflects typical specialty café operational horizon. |
| **Customer Lifetime Value (LTV)** | **₹16,000** | $20 \text{ months} \times ₹800 \text{ contribution/month}$. |
| **LTV / CAC Ratio** | **8.0x** | Healthy SaaS unit economics benchmark (>3x target). |
| **CAC Payback Period** | **2.5 months** | $\frac{\text{CAC}}{₹800/\text{mo}} = \frac{₹2,000}{₹800} = 2.5 \text{ months}$. |

> [!NOTE]
> **Academic Note on Validation:** All figures above represent our **pre-market economic model**. They do not represent audited historical financials. The first step toward validating these figures is the single-store experiment outlined in `FIRST_CUSTOMER_EXPERIMENT.md`.
