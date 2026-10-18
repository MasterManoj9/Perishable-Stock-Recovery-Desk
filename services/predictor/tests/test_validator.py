"""
Unit Tests for Data Validator and Profiler
FYND Predict - AI Demand Intelligence
"""

import unittest
import pandas as pd
import numpy as np
from services.predictor.data_pipeline.validator import DataValidator


class TestDataValidator(unittest.TestCase):

    def setUp(self):
        self.validator = DataValidator()

    def test_canonical_column_mapping(self):
        cols = ['Transaction_Date', 'Store_ID', 'SKU', 'Quantity', 'Store_Type']
        mapping = self.validator.infer_column_mapping(cols)
        self.assertEqual(mapping.get('date'), 'Transaction_Date')
        self.assertEqual(mapping.get('location_id'), 'Store_ID')
        self.assertEqual(mapping.get('product_id'), 'SKU')
        self.assertEqual(mapping.get('units_sold'), 'Quantity')

    def test_missing_required_columns_rejection(self):
        # Missing units_sold
        df = pd.DataFrame({
            'date': ['2026-08-01', '2026-08-02'],
            'location_id': ['LOC1', 'LOC1'],
            'product_id': ['SKU1', 'SKU1']
        })
        canon_df, report = self.validator.validate_file(df)
        self.assertFalse(report['valid'])
        self.assertIn('units_sold', report['missing_required_fields'])

    def test_negative_quantity_anomaly_flagging(self):
        df = pd.DataFrame({
            'date': ['2026-08-01', '2026-08-02', '2026-08-03'],
            'location_id': ['LOC1', 'LOC1', 'LOC1'],
            'product_id': ['SKU1', 'SKU1', 'SKU1'],
            'units_sold': [10, -5, 8]
        })
        canon_df, report = self.validator.validate_file(df)
        self.assertTrue(any(a['type'] == 'NEGATIVE_QUANTITIES' for a in report['anomalies']))

    def test_valid_dataset_quality_score(self):
        dates = pd.date_range('2026-07-01', periods=30, freq='D')
        df = pd.DataFrame({
            'date': dates,
            'location_id': ['LOC1'] * 30,
            'product_id': ['SKU1'] * 30,
            'units_sold': np.random.randint(5, 20, size=30)
        })
        canon_df, report = self.validator.validate_file(df)
        self.assertTrue(report['valid'])
        self.assertGreaterEqual(report['quality_score'], 80.0)


if __name__ == '__main__':
    unittest.main()
