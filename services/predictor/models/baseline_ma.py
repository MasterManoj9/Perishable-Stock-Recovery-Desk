"""
Model B: Moving Average Baseline
FYND Predict - AI Demand Intelligence
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List


class MovingAverageModel:
    """
    Baseline Model B: Moving Average.
    Projects demand as the arithmetic mean of the recent trailing window (e.g. 7 or 14 days).
    """

    def __init__(self, window_days: int = 7):
        self.name = f"{window_days}-Day Moving Average Baseline"
        self.family = "baseline_moving_average"
        self.window_days = window_days
        self.series_means = {}

    def fit(self, train_df: pd.DataFrame) -> "MovingAverageModel":
        """Calculates series-level training mean for fallback."""
        self.series_means = {}
        for (loc_id, prod_id), group in train_df.groupby(['location_id', 'product_id']):
            tail_sales = group.sort_values('date')['units_sold'].tail(self.window_days)
            mean_val = float(tail_sales.mean()) if len(tail_sales) > 0 else 0.0
            self.series_means[(loc_id, prod_id)] = mean_val
        return self

    def predict_eval(self, val_df: pd.DataFrame) -> np.ndarray:
        """Evaluates against holdout rows using engineered rolling_mean_7."""
        preds = []
        col = f'rolling_mean_{self.window_days}'
        fallback_col = 'rolling_mean_7' if col != 'rolling_mean_7' else 'lag_1'

        for _, row in val_df.iterrows():
            loc_id = row['location_id']
            prod_id = row['product_id']

            if pd.notna(row.get(col)):
                val = float(row[col])
            elif pd.notna(row.get(fallback_col)):
                val = float(row[fallback_col])
            else:
                val = self.series_means.get((loc_id, prod_id), 0.0)

            preds.append(max(0.0, round(val, 2)))

        return np.array(preds)

    def forecast_horizon(
        self,
        recent_history_df: pd.DataFrame,
        horizon_days: int = 7
    ) -> List[Dict[str, Any]]:
        """Projects out-of-sample forward demand for the next horizon_days."""
        forecast_rows = []
        max_date = pd.to_datetime(recent_history_df['date']).max()

        for (loc_id, prod_id), group in recent_history_df.groupby(['location_id', 'product_id']):
            group = group.sort_values('date').copy()
            tail_window = group['units_sold'].tail(self.window_days)
            mean_pred = float(tail_window.mean()) if len(tail_window) > 0 else 0.0
            std_dev = float(tail_window.std()) if len(tail_window) >= 2 else 1.0
            if np.isnan(std_dev): std_dev = 1.0

            pred = max(0.0, round(mean_pred, 1))
            lower_bound = max(0.0, round(pred - 1.28 * std_dev, 1))
            upper_bound = max(pred, round(pred + 1.28 * std_dev, 1))

            for day_offset in range(1, horizon_days + 1):
                target_date = max_date + pd.Timedelta(days=day_offset)
                forecast_rows.append({
                    'location_id': loc_id,
                    'product_id': prod_id,
                    'product_name': group['product_name'].iloc[0] if 'product_name' in group.columns else prod_id,
                    'business_type': group['business_type'].iloc[0] if 'business_type' in group.columns else 'Unknown',
                    'forecast_date': target_date.strftime('%Y-%m-%d'),
                    'day_of_week': int(target_date.dayofweek),
                    'horizon_day': day_offset,
                    'predicted_units': pred,
                    'lower_bound': lower_bound,
                    'upper_bound': upper_bound,
                    'method': f'{self.window_days}-Day Moving Average'
                })

        return forecast_rows
