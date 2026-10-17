# FIRST-CUSTOMER ACQUISITION EXPERIMENT & OUTREACH PLAN
**FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk**
**Document Type:** Customer Discovery Protocol & Outbound Acquisition Plan  
**Status:** PROPOSED & READY FOR EXECUTION (Zero live contacts initiated prior to authorized hackathon release)  
**Target Profile:** Independent Café / Artisanal Bakery Owner-Operator or General Manager  

---

## 1. Outreach Status & Ethical Boundary

> [!IMPORTANT]
> **Mandatory Disclosure of Real Outreach Status:**
> - **Total Live Retailers Contacted to Date:** **0**
> - **Total Commercial Agreements Signed:** **0**
> - **Status:** This document defines a **reproducible, structured field experiment protocol** designed to acquire and interview the very first retail partner following the project presentation. No synthetic data or simulated feedback has been misrepresented as actual customer interviews.

---

## 2. Target Profile & Location Identification

### 2.1 Target Decision-Maker
- **Role:** Café Owner-Operator, Partner, or On-Site General Manager (individuals with direct P&L responsibility and price-setting authority).
- **Target Category:** Independent specialty coffee shops, artisanal bakeries, or European-style delis.
- **Assortment Characteristics:** In-house baked breads, croissants, pre-wrapped gourmet sandwiches, and fresh milk/dairy inventory with strict 24–48 hour shelf-lives.

### 2.2 Sourcing & Territory Selection
- **Target Territory:** High-density commercial and education hubs in Hyderabad (e.g., Jubilee Hills, Madhapur, Gachibowli, or campus-adjacent café clusters).
- **Sample Selection (Target: 10 Local Cafés):**
  1. Identified through local Google Maps business profiles with tags `#Bakery`, `#SpecialtyCoffee`, `#ArtisanBreads`.
  2. Filtered for businesses with active evening operations (open past 8:00 PM) where daily closing markdown decisions occur.

---

## 3. Outreach Protocol & Communication Script

### 3.1 Initial Contact Channel: In-Person Afternoon Visit
*Best timing: 3:00 PM – 4:30 PM (between lunch rush and evening coffee footfall when the manager is accessible).*

### 3.2 Respectful, Zero-Pressure In-Person Script
> *"Good afternoon [Manager Name / Store Owner], my name is [Name]. I am an MBA researcher working with the FYND × NMIMS product initiative on retail inventory tools.*
>
> *We have built a simple, non-intrusive floor tool that helps café managers safely recover cash on evening perishable batches (like sourdough, croissants, and dairy packs) before they expire overnight, while ensuring 100% compliance with food safety.*
>
> *I am not selling software today. I would love to ask you five quick questions about how you currently handle end-of-day ageing stock and show you a 2-minute demonstration on an iPad. If you find it interesting, we’d love to sponsor a zero-cost, supervised 1-week pilot in your store."*

### 3.3 Digital Follow-Up Message (WhatsApp / Email)
> *"Hello [Manager Name], thank you for chatting briefly at [Café Name] today!*
>
> *As mentioned, here is the link to test our Perishable Stock Recovery Desk prototype: [Deployment URL].*
>
> *Key takeaway: It calculates exact net contribution after your ingredient costs, blocks expired stock automatically, and caps markdown sales by expected evening demand so you never give away margin unnecessarily.*
>
> *Would you have 15 minutes tomorrow afternoon to run through two of your real daily items (e.g., your artisan loaves or sandwiches)? Best regards, [Name]."*

---

## 4. Discovery Interview Protocol (5-Question Script)

The interview lasts 8–10 minutes and focuses on uncovering current operational reality:

| Question # | Focus Area | Discovery Interview Question | What We Are Listening For |
| :---: | :--- | :--- | :--- |
| **Q1** | **Current Practice** | *"At what time of day do you inspect stock that is expiring today or tomorrow morning, and who makes the call on what to do with it?"* | Is it systematic or haphazard? Is authority with the owner or floor staff? |
| **Q2** | **Markdown Handling** | *"When you decide to mark down an item—say, fresh sandwiches or croissants—how do you choose the discounted price?"* | Do they calculate cost-plus contribution, or use a flat 50% sticker? Do they ever verify incremental cost? |
| **Q3** | **Waste Tracking** | *"How do you currently record stock that isn't sold by closing time? Is it logged in your POS, written in a notebook, or just binned?"* | Do they have an audit trail? What is the estimated daily waste value? |
| **Q4** | **Food Safety Rules** | *"What are your store’s strict rules around temperature-controlled dairy or day-old bread? Have you ever had staff accidentally leave questionable stock on display?"* | How critical is automated food-safety gating to their peace of mind? |
| **Q5** | **Willingness to Pilot** | *"If a lightweight tablet tool could calculate safe markdowns and save your store ₹3,000–₹5,000 in lost food costs every month, would you let us run a 5-day supervised pilot next week at zero cost?"* | Direct test of willingness to adopt and pilot commitment. |

---

## 5. Live Product Demonstration Flow (3-Minute Tour)

During the visit, the interviewer demonstrates the application live on a mobile browser or tablet:

1. **Step 1 — The Dilemma (Dashboard):** Open `/` on the tablet. Point to the **Expiring Soon (4 batches)** card and the Donut chart showing 42% stock under safety pressure.
2. **Step 2 — The Calculation (Simulator):** Select Batch B1 (Fresh Dairy Milk, cost ₹25, regular price ₹40).
   - Set recovery price to ₹35.
   - Show that the screen immediately displays: *Discount: 12.5%, Unit Contribution: +₹10.00, Demand: 10 units $\implies$ Net Cash Recovery: +₹100.00*.
3. **Step 3 — Demand Realism (Gate 3):** Change demand to 5 units.
   - Point out that allocated quantity drops to 5, and the 5 unsold units remain **visibly accounted for**, preventing false optimism.
4. **Step 4 — Safety Enforcement (Gate 1):** Switch to Batch B2 (Expired Sourdough Loaf, cost ₹20, price ₹50).
   - Show the prominent **Amber Warning: Unapproved Theoretical Margin (+₹30/unit)**.
   - Explain: *"Even though you'd make ₹30/unit on paper, our tool refuses to recommend or approve the sale because safety regulations always override margin."*
5. **Step 5 — Audit Trail:** Click **Record Quarantine Action**, navigate to `/decisions`, and show how the decision is saved with an unalterable timestamp for the accountant.

---

## 6. Evaluation Framework: Response Categorization

Every manager interaction is classified objectively into one of three outcomes:

```
                                  [MANAGER INTERACTION]
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
         v                                  v                                  v
   [POSITIVE OUTCOME]             [INCONCLUSIVE OUTCOME]             [NEGATIVE OUTCOME]
- Agrees to 5-day pilot.         - Interested in theory, but:       - Outright refusal:
- Shares actual SKU cost/price.   - "Owner is away."                 - "We discard everything."
- Requests login or demo link.   - "Need POS integration first."    - "Too complicated."
- Quotes waste as painful.       - "No time to test this week."     - "Markdown hurts brand image."
```

### Detailed Classification Criteria:
- **Positive Outcome (Advance to Pilot):**
  - Manager confirms at least ₹5,000/month in perishable discard pain.
  - Agrees to a specific 5-day pilot date.
  - Permits observing 2 to 5 specific fresh bakery/dairy SKUs.
- **Inconclusive Outcome (Follow-up Pipeline):**
  - Manager acknowledges the problem but lacks authority to pilot without owner sign-off.
  - Demands direct POS integration (e.g., Petpooja, UrbanPiper) before floor trial.
- **Negative Outcome (Disqualification / Pivot Insight):**
  - Retailer operates under strict corporate brand policy forbidding any public markdowns (prefers 100% waste or complete donation).
  - Spoilage rate is negligible (<1%), making margin recovery irrelevant.

---

## 7. Evidence Recording Protocol

For each outreach event, the team maintains an immutable log entry in our experiment tracking sheet:

```csv
Date,Store_Name,Contact_Role,Location,Current_Waste_Handling,Estimated_Daily_Waste_INR,Demo_Completed,Outcome_Category,Notes_and_Feedback,Next_Step
```

*All records collected during the post-hackathon execution will be preserved with timestamps and direct quotes.*
