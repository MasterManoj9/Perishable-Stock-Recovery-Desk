"""
Unit Tests for Forecasting Models and Evaluation Metrics
FYND Predict - AI Demand Intelligence
"""

import unittest
import numpy as np
import pandas as pd
from services.predictor.models.evaluator import calculate_mae, calculate_wape, calculate_rmse, evaluate_predictions
from services.predictor.models.baseline_snaive import SeasonalNaiveModel
from services.predictor.models.baseline_ma import MovingAverageModel
from services.predictor.models.candidate_ml import GradientBoostingDemandModel


class TestModelsAndMetrics(unittest.TestCase):

    def test_calculate_mae(self):
        y_true = np.array([10, 20, 30])
        y_pred = np.array([12, 18, 30])
        # |10-12|=2, |20-18|=2, |30-30|=0 -> mean = 4/3 = 1.333...
        self.assertAlmostEqual(calculate_mae(y_true, y_pred), 1.3333333)

    def test_calculate_wape_standard_and_zero_division(self):
        y_true = np.array([10, 20, 30])
        y_pred = np.array([12, 18, 30])
        # total err = 4, total actual = 60 -> 4/60 * 100 = 6.67%
        self.assertEqual(calculate_wape(y_true, y_pred), 6.67)

        # Zero actual sales safety guard
        y_zero = np.array([0, 0, 0])
        self.assertEqual(calculate_wape(y_zero, y_zero), 0.0)
        self.assertEqual(calculate_wape(y_zero, np.array([1, 2, 3])), 100.0)

    def test_baseline_models_fit_and_predict(self):
        dates = pd.date_range('2026-07-01', periods=35, freq='D')
        df = pd.DataFrame({
            'date': dates,
            'location_id': ['LOC1'] * 35,
            'product_id': ['SKU1'] * 35,
            'units_sold': [float((i % 7) * 2 + 5) for i in range(35)],
            'day_of_week': [d.dayofweek for d in dates],
            'lag_7': [float(((i - 7) % 7) * 2 + 5) if i >= 7 else 5.0 for i in range(35)],
            'rolling_mean_7': [10.0] * 35,
            'business_type': ['Cafe'] * 35,
            'product_name': ['Item A'] * 35
        })

        # Test Seasonal Naive
        snaive = SeasonalNaiveModel()
        snaive.fit(df.iloc[:28])
        preds_snaive = snaive.predict_eval(df.iloc[28:])
        self.assertEqual(len(preds_snaive), 7)
        self.assertTrue(all(p >= 0 for p in preds_snaive))

        # Test Moving Average
        ma = MovingAverageModel(window_days=7)
        ma.fit(df.iloc[:28])
        preds_ma = ma.predict_eval(df.iloc[28:])
        self.assertEqual(len(preds_ma), 7)
        self.assertTrue(all(p >= 0 for p in preds_ma))

    def test_prediction_bounds_consistency(self):
        y_true = np.array([15, 20, 25])
        y_pred = np.array([14, 21, 24])
        metrics = evaluate_predictions(y_true, y_pred)
        self.assertIn('mae', metrics)
        self.assertIn('wape_pct', metrics)
        self.assertIn('rmse', metrics)
        self.assertGreater(metrics['rmse'], 0)


if __name__ == '__main__':
    unittest.main()
