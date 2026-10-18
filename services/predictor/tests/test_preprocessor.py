"""
Unit Tests for Preprocessing and Feature Pipeline
FYND Predict - AI Demand Intelligence
"""

import unittest
import pandas as pd
import numpy as np
from services.predictor.data_pipeline.preprocessor import FeaturePipeline
from services.predictor.data_pipeline.chronological_split import split_chronological


class TestPreprocessor(unittest.TestCase):

    def setUp(self):
        self.pipeline = FeaturePipeline()
        dates = pd.date_range('2026-07-01', periods=40, freq='D')
        self.sample_df = pd.DataFrame({
            'date': dates,
            'location_id': ['LOC1'] * 40,
            'product_id': ['SKU1'] * 40,
            'units_sold': [float(i % 10 + 2) for i in range(40)],
            'business_type': ['Cafe'] * 40,
            'product_name': ['Item A'] * 40
        })

    def test_calendar_feature_extraction(self):
        cal_df = self.pipeline.extract_calendar_features(self.sample_df)
        self.assertIn('day_of_week', cal_df.columns)
        self.assertIn('is_weekend', cal_df.columns)
        self.assertIn('day_of_month', cal_df.columns)
        self.assertTrue(all(cal_df['is_weekend'].isin([0, 1])))

    def test_lag_and_rolling_no_future_leakage(self):
        feat_df = self.pipeline.compute_lags_and_rolling(self.sample_df)
        self.assertIn('lag_1', feat_df.columns)
        self.assertIn('lag_7', feat_df.columns)
        self.assertIn('rolling_mean_7', feat_df.columns)

        # lag_1 at index 1 must equal units_sold at index 0
        self.assertEqual(feat_df['lag_1'].iloc[1], self.sample_df['units_sold'].iloc[0])
        # lag_7 at index 7 must equal units_sold at index 0
        self.assertEqual(feat_df['lag_7'].iloc[7], self.sample_df['units_sold'].iloc[0])

    def test_chronological_split_strict_ordering(self):
        feat_df, _ = self.pipeline.prepare_dataset(self.sample_df)
        train_df, val_df, split_info = split_chronological(feat_df, holdout_days=10)

        # Validation dates must be strictly greater than max train date
        max_train_date = train_df['date'].max()
        min_val_date = val_df['date'].min()
        self.assertLess(max_train_date, min_val_date)
        self.assertEqual(split_info['holdout_days'], 10)


if __name__ == '__main__':
    unittest.main()
