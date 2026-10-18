# Business Insights & Unit Economics Methodology

## 1. Core Principles & Epistemic Rules

The **Business Insights Engine** adheres to strict data integrity standards:
1. **Zero Fabrication:** If no orders exist in a selected time window, the system displays an empty state. It never generates synthetic chart values to give the illusion of activity.
2. **Payment Status Disambiguation:** Only orders with verified payment status (`paymentStatus === 'success'` or `status === 'confirmed'`) are included in sales revenue and unit metrics. Pending, abandoned, or cancelled orders are strictly excluded from revenue.
3. **Integer Currency Precision:** All underlying values originate from integer paise to avoid rounding discrepancies.

---

## 2. Metric Calculation Formulas

### 2.1 Sales & Revenue Metrics
$$\text{Gross Sales} = \sum_{\text{orders} \in \text{Completed}} \text{subtotal}$$
$$\text{Total Completed Orders} = |\text{Completed Orders}|$$
$$\text{Average Order Value (AOV)} = \frac{\text{Gross Sales}}{\text{Total Completed Orders}}$$
$$\text{Total Units Recovered} = \sum_{\text{items} \in \text{Completed Orders}} \text{quantity}$$

### 2.2 Repeat Purchase & Customer Retention
Repeat purchase rate measures customer loyalty and willingness to repeatedly buy near-expiry food items:

$$\text{Unique Purchasing Customers } (U) = |\{ \text{customerId} \mid \text{orders}(\text{customerId}) \ge 1 \}|$$
$$\text{Repeat Customers } (R) = |\{ \text{customerId} \mid \text{orders}(\text{customerId}) \ge 2 \}|$$
$$\text{Repeat Purchase Rate } (\%) = \begin{cases} \left( \frac{R}{U} \right) \times 100, & U > 0 \\ 0, & U = 0 \end{cases}$$

### 2.3 Product Rankings & Top Month Determination
- **Best-Performing Product:** Catalog item maximizing total recovery revenue:
  $$\text{Product Revenue}(P) = \sum_{\text{item.productId} = P} \text{item.lineTotal}$$
- **Best-Performing Month:** Calendar month maximizing monthly sales revenue:
  $$\text{Month Revenue}(M) = \sum_{\text{order.month} = M} \text{order.subtotal}$$

### 2.4 Perishable Waste & Recovery Balance
Tracks the physical fate of all perishable units across the store:
- **Units Recovered:** Units purchased and safely consumed prior to expiry.
- **Eligible Unsold Stock:** Units currently on display, eligible for recovery.
- **Quarantined Stock:** Units undergoing cold-chain review.
- **Disposed Stock:** Batches marked damaged or having passed their expiration timestamp.

$$\text{Recovery Rate } (\%) = \frac{\text{Units Recovered}}{\text{Units Recovered} + \text{Eligible Unsold} + \text{Disposed}} \times 100$$

---

## 3. Date-Range Filters Specification

| Filter ID | Label | Window Definition |
|---|---|---|
| `weekly` | Last 7 Days | $t \ge \text{now} - 7\text{ days}$ |
| `monthly` | Last 30 Days | $t \ge \text{now} - 30\text{ days}$ |
| `last_3m` | Last 3 Months | $t \ge \text{now} - 90\text{ days}$ |
| `last_6m` | Last 6 Months | $t \ge \text{now} - 180\text{ days}$ |
| `last_1y` | Last 1 Year | $t \ge \text{now} - 365\text{ days}$ |
| `all` | All Time | Unbounded ($t \ge 0$) |
