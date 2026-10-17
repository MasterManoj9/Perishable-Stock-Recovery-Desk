# FYND × NMIMS Hyderabad — C30 Perishable Stock Recovery Desk
## Agent-Ready Project Requirements, Implementation Plan, and Acceptance Checklist
**Version:** 1.0  
**Event:** FYND × NMIMS Hyderabad Product and Business Simulation  
**Case ID:** C30  
**Time budget:** 19 hours remaining at planning time  
**Primary user:** Café or small grocery store manager  
**Engineering objective:** Build a working, reproducible web application that helps a manager choose safe, economically sensible actions for ageing perishable stock.  
**Important evidence rule:** Synthetic data can demonstrate software behavior, but must never be presented as proof of live revenue, real waste reduction, customer demand, or willingness to pay.

### 1. Project Summary
C30 — Perishable Stock Recovery Desk is a decision-support web application for café and small grocery managers. It helps them inspect ageing inventory, simulate markdown prices and demand scenarios, determine eligible quantities, calculate contribution, record a recommended or chosen action, and export evidence.

The product must balance three constraints:
1. Food-safety and stock eligibility: expired, damaged, or unresolved cold-chain-exception stock must not be recommended for sale.
2. Economics: a markdown must respect the supplied minimum contribution rules and allowed markdown limits.
3. Demand and availability: the allocated quantity cannot exceed available eligible stock or supported demand. Unsold stock must remain visible.

### 2. Mandatory Case Checks
1. **Case check 1 — contribution (10 points):** 10 units sold at ₹40 each; incremental cost is ₹25 per unit. Expected: Contribution per unit = ₹40 − ₹25 = ₹15. Total contribution = 10 × ₹15 = ₹150.
2. **Case check 2 — expired stock (10 points):** An expired batch must not be sellable even if the proposed selling price yields an attractive contribution. Expected: action blocked, sellable quantity zero, and a clear reason.
3. **Case check 3 — demand cap (5 points):** Demand above available stock is capped. Example: available quantity 8, supported demand 12 -> allocate at most 8; show remaining demand or unmet demand clearly. Inverse: available 12, supported demand 8 -> allocate at most 8 and leave 4 units unsold.

### 3. Core Formulas
- contributionPerUnit = sellingPrice - incrementalCost
- contributionTotal = contributionPerUnit * allocatedQuantity
- allocatedQuantity = min(availableEligibleQuantity, supportedDemand)
- unsoldQuantity = availableEligibleQuantity - allocatedQuantity
