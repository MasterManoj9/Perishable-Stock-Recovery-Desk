# JUDGE DEMONSTRATION SCRIPT (4–5 MINUTES)
**FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk**
**Document Type:** Hackathon Presentation & Live Evaluation Script  
**Target Duration:** 4 minutes 30 seconds (Adjustable from 3 to 6 minutes)  
**Presenter:** Engineering Lead & MBA Product Presenter  
**Live Application URL:** `http://localhost:5000/` (or deployed static host)  

---

## Quick Reference Timing & Flow

```
[0:00 - 0:45] --> Act 1: Problem Context & The Attention Dashboard
[0:45 - 1:45] --> Act 2: Economic Simulation & Case Check 1 (B1 ₹150)
[1:45 - 2:30] --> Act 3: Demand-Capped Allocation & Unsold Inventory (Case Check 3)
[2:30 - 3:15] --> Act 4: The Food Safety Gate & Case Check 2 (Expired B2 Hard-Block)
[3:15 - 3:50] --> Act 5: Decision Commit, Persistence, and Audit Log
[3:50 - 4:30] --> Act 6: MBA Commercial Model & Supervised Pilot Plan
```

---

## Minute-by-Minute Live Script

### Act 1: Problem Context & The Attention Dashboard (0:00 – 0:45)
**Screen:** Navigate to `/` (Dashboard view).

- **Spoken Narration:**
  > *"Good morning, esteemed judges and evaluators. In India's food service sector, café and bakery managers face a daily 4:00 PM crisis: hundreds of rupees worth of fresh morning bread, pastries, and dairy will expire within 8 to 12 hours.
  >
  > Today, managers rely on gut-feel stickers or throw the food into the bin at a 100% loss.
  >
  > Here is the **Perishable Stock Recovery Desk**. At a glance, our **Stock Status Donut Chart** and KPI cards alert the manager immediately: out of 24 batches, 4 are expiring soon, and 3 are already blocked for safety reasons. The system immediately surfaces batches requiring action under **Immediate Attention Required**."*

---

### Act 2: Economic Simulation & Case Check 1 (0:45 – 1:45)
**Screen:** Click **"Simulate Markdown"** on Batch **B1** (Fresh Dairy Milk 1L) to enter `/simulator`.

- **Spoken Narration:**
  > *"Let's examine our first official fixture batch: **Batch B1**.
  >
  > Notice the transparent data box:
  > - Available Quantity: **10 units**
  > - Original Selling Price: **₹40.00**
  > - Incremental Cost: **₹25.00**
  > - Supported Evening Demand: **10 units**
  >
  > If we maintain the allowed price of **₹40.00**, our engine calculates:
  > $$\text{Unit Margin} = ₹40 - ₹25 = \mathbf{+₹15.00}$$
  > $$\text{Total Net Contribution} = 10 \times ₹15 = \mathbf{+₹150.00}$$
  >
  > This is **Case Check 1 (10 Points)** passing cleanly.
  >
  > If the manager adjusts the price slider down to **₹35.00** (a 12.5% discount), the system re-calculates instantly: unit contribution drops to **₹10.00**, and projected recovery contribution becomes **₹100.00**. Incremental cost is never counted twice, and gross revenue is clearly separated from net contribution."*

---

### Act 3: Demand-Capped Allocation & Unsold Inventory (1:45 – 2:30)
**Screen:** On `/simulator` with Batch B1, change Demand Assumption from **10** to **15**, then to **5**.

- **Spoken Narration:**
  > *"Now, let's test market reality: **Case Check 3 (5 Points)**.
  >
  > If the manager assumes a surge demand of **15 units**, watch what happens:
  > - We only have **10 units** of stock.
  > - The Recovery Desk **strictly caps allocated units at 10**. It flags that demand was capped, preventing false sales projections.
  >
  > Now look at the inverse: if demand drops to **5 units**:
  > - Allocated units drop to **5**.
  > - Net contribution is **₹50.00** ($5 \times ₹10$).
  > - And critically: the **5 unsold units remain 100% visible** on screen. We never sweep unsold food under the rug."*

---

### Act 4: The Food Safety Gate & Case Check 2 (2:30 – 3:15)
**Screen:** Switch to Batch **B2** (Artisan Sourdough Loaf) in the batch dropdown or `/inventory`.

- **Spoken Narration:**
  > *"Now, here is our core business-feedback improvement: **Case Check 2 (10 Points)**.
  >
  > Look at **Batch B2**:
  > - Original price: **₹50.00**
  > - Incremental cost: **₹20.00**
  > - On paper, this item looks extremely profitable: a potential margin of **+₹30.00 per unit**!
  >
  > However, Batch B2 is **EXPIRED**.
  >
  > Notice what our engine does:
  > 1. It displays an amber **Unapproved Theoretical Margin** alert, clearly explaining that economic attractiveness never overrides food safety.
  > 2. Sellable quantity is locked to **0**.
  > 3. Projected contribution is locked to **₹0.00**.
  > 4. The status is locked to **EXPIRED — STRICT BLOCK**.
  >
  > The system allows the manager to record a **Quarantine Action** for audit purposes, but will never allow this batch to be sold."*

---

### Act 5: Decision Commit, Persistence, and Audit Log (3:15 – 3:50)
**Screen:** Click **"Record Quarantine Action"** on B2, confirm the modal, and navigate to `/decisions`.

- **Spoken Narration:**
  > *"When the manager commits an action, a comprehensive **Before vs. After snapshot** is confirmed.
  >
  > Navigating to the **Decision History (`/decisions`)**, we see our immutable client audit trail:
  > - Timestamped decision records with status badges (`APPROVED`, `QUARANTINED`, `REJECTED`).
  > - With one click, the manager can export this entire log as an **RFC 4180-compliant CSV** or structured **JSON** for store accounting and food-safety inspectors."*

---

### Act 6: MBA Commercial Model & Supervised Pilot (3:50 – 4:30)
**Screen:** Navigate to `/reports` (Case Checks verification & evidence package).

- **Spoken Narration:**
  > *"To commercialize this desk, our MBA assignment defines a lean **₹999/month per-counter SaaS subscription** for independent cafés. With variable cost-to-serve estimated at ₹199/month, we achieve an **80% gross margin**.
  >
  > We have designed a **5-day supervised single-store pilot** with strict FSSAI compliance and zero-risk abort triggers.
  >
  > Finally, in our `/reports` view, you can see all **3 mandatory case checks passing in exact required sequence (25 / 25 points)**.
  >
  > As an engineering and business team, we state with absolute transparency: **synthetic fixture results demonstrate software correctness, not proof of live store adoption**. We are ready to take this tool to our first retail partner. Thank you, and we welcome your questions!"*

---

## Fallback Demonstration Plan (Contingency Protocol)

In the event of an unexpected projector, network, or laptop failure during the presentation:

| Failure Mode | Immediate Fallback Action |
| :--- | :--- |
| **Local dev server crashes / port conflict** | Run production preview: `npm run preview -- --port 5000` (verified working build in `dist/`). |
| **Browser cache or corrupted localStorage** | Click the **"Reset Store"** / Clear button in `/decisions` or run `localStorage.clear()` in DevTools. |
| **Hardware / Machine failure** | Open the pre-generated visual artifacts (`.png` screenshots of Dashboard, Simulator B1, Simulator B2, and Decisions Log stored in conversation artifacts) on a backup phone or tablet. |
| **Time cut short to 2 minutes** | Jump directly to Act 2 (Batch B1 ₹150 contribution) and Act 4 (Batch B2 expired hard-block), then state: *"All 3 case checks verified 25/25 pts."* |
