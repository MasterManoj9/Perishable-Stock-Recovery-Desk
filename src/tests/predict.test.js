import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateSmartPurchasePlan,
  buildTimeSeriesChartData,
  getLatestPredictData
} from '../data/predictAdapter.js';
import initialData from '../data/predictInitialData.js';

describe('FYND Predict Adapter & Forecasting Calculations', () => {

  it('calculates Smart Purchase Plan using exact lead time & safety stock formula', () => {
    // 7-day forecast = 70 units -> 10 units/day
    // Lead time = 2 days -> 20 units
    // Safety stock = 3 days -> 30 units
    // Gross requirement = 50 units
    // On hand = 15 units, Incoming = 5 units
    // Net suggestion = 50 - 15 - 5 = 30 units
    const plan = calculateSmartPurchasePlan({
      forecastUnits7d: 70,
      onHandUnits: 15,
      leadTimeDays: 2,
      safetyStockDays: 3,
      incomingOrders: 5
    });

    assert.strictEqual(plan.dailyDemandRate, 10);
    assert.strictEqual(plan.leadTimeDemand, 20);
    assert.strictEqual(plan.safetyStockUnits, 30);
    assert.strictEqual(plan.grossRequirement, 50);
    assert.strictEqual(plan.netOrderSuggestion, 30);
    assert.ok(plan.assumptions.length >= 3);
  });

  it('caps Smart Purchase Order at 0 when on-hand stock exceeds requirement', () => {
    // Gross = 30, On hand = 40 -> Net suggestion = 0 (never negative)
    const plan = calculateSmartPurchasePlan({
      forecastUnits7d: 70,
      onHandUnits: 40,
      leadTimeDays: 1,
      safetyStockDays: 2,
      incomingOrders: 0
    });

    assert.strictEqual(plan.netOrderSuggestion, 0);
  });

  it('constructs Recharts time-series data without lookahead leakage', () => {
    const chartPoints = buildTimeSeriesChartData(initialData, 'CAFE01', 'all');

    assert.ok(Array.isArray(chartPoints));
    assert.ok(chartPoints.length > 0);

    // Verify presence of historical points and future points
    const historical = chartPoints.filter(p => !p.is_future);
    const future = chartPoints.filter(p => p.is_future);

    assert.ok(historical.length >= 14, 'Must have at least 14 days of history');
    assert.strictEqual(future.length, 7, 'Must have exactly 7 future forecast days');

    // Historical points must have actual_units and no future forecast_units
    assert.ok(typeof historical[0].actual_units === 'number');
    assert.strictEqual(historical[0].forecast_units, null);

    // Future points must have forecast_units and bounds
    assert.ok(typeof future[0].forecast_units === 'number');
    assert.ok(future[0].lower_bound <= future[0].forecast_units);
    assert.ok(future[0].upper_bound >= future[0].forecast_units);
  });

  it('verifies verified initial training dataset integrity and KPI metrics', () => {
    assert.strictEqual(initialData.status, 'completed');
    assert.strictEqual(initialData.selected_model, 'Global Gradient Boosting Regressor');
    assert.strictEqual(initialData.summary_kpis.quality_score, 100);
    assert.strictEqual(initialData.summary_kpis.active_locations_count, 4);
    assert.strictEqual(initialData.summary_kpis.active_products_count, 10);

    // Verify MAE and WAPE are positive numbers
    assert.ok(initialData.summary_kpis.validation_mae > 0);
    assert.ok(initialData.summary_kpis.validation_wape_pct > 0);
    assert.ok(initialData.summary_kpis.baseline_lift_pct > 0);
  });

});
