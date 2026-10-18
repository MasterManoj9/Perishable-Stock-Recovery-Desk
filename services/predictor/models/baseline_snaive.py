"""
Model A: Seasonal-Naïve Baseline
FYND Predict - AI Demand Intelligence
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List


class SeasonalNaiveModel:
    """
    Baseline Model A: Seasonal-Naïve.
    Projects future demand for a weekday based on the corresponding previous same-weekday observation
    or 4-week same-weekday average.
    """

    def __init__(self, use_4w_average: bool = True):
        self.name = "Seasonal-Naïve Baseline"
        self.family = "baseline_seasonal_naive"
        self.use_4w_average = use_4w_average
        self.weekday_profiles = {}

    def fit(self, train_df: pd.DataFrame) -> "SeasonalNaiveModel":
        """Calculates historical weekday averages per series from training data."""
        self.weekday_profiles = {}
        for (loc_id, prod_id), group in train_df.groupby(['location_id', 'product_id']):
            # Calculate mean per day of week (0 to 6)
            weekday_means = group.groupby('day_of_week')['units_sold'].mean().to_dict()
            # Overall mean fallback
            overall_mean = float(group['units_sold'].mean())
            self.weekday_profiles[(loc_id, prod_id)] = {
                'weekday_means': weekday_means,
                'overall_mean': overall_mean
            }
        return self

    def predict_eval(self, val_df: pd.DataFrame) -> np.ndarray:
        """Generates predictions for validation set using pre-engineered seasonal lags."""
        preds = []
        for _, row in val_df.iterrows():
            loc_id = row['location_id']
            prod_id = row['product_id']
            dow = int(row['day_of_week'])

            # Priority 1: Use same_weekday_4w_mean if available and non-null
            if self.use_4w_average and pd.notna(row.get('same_weekday_4w_mean')):
                pred = float(row['same_weekday_4w_mean'])
            # Priority 2: Use lag_7 (same day last week)
            elif pd.notna(row.get('lag_7')):
                pred = float(row['lag_7'])
            # Priority 3: Fitted weekday profile
            elif (loc_id, prod_id) in self.weekday_profiles:
                profile = self.weekday_profiles[(loc_id, prod_id)]
                pred = profile['weekday_means'].get(dow, profile['overall_mean'])
            else:
                pred = 0.0

            preds.append(max(0.0, round(pred, 2)))

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
            profile = self.weekday_profiles.get((loc_id, prod_id), {})
            weekday_means = profile.get('weekday_means', {})
            overall_mean = profile.get('overall_mean', float(group['units_sold'].mean()) if len(group) > 0 else 0.0)

            for day_offset in range(1, horizon_days + 1):
                target_date = max_date + pd.Timedelta(days=day_offset)
                target_dow = target_date.dayofweek

                # Look for same weekday in recent history (e.g. 7 days prior, 14 days prior)
                past_match = group[group['day_of_week'] == target_dow]
                if len(past_match) >= 1:
                    recent_obs = past_match['units_sold'].tail(4).mean()
                    pred = float(recent_obs)
                elif target_dow in weekday_means:
                    pred = float(weekday_means[target_dow])
                else:
                    pred = overall_mean

                pred = max(0.0, round(pred, 1))

                # Simple variance bound based on group standard deviation
                std_dev = float(group['units_sold'].tail(14).std()) if len(group) >= 2 else 1.0
                if np.isnan(std_dev): std_dev = 1.0
                lower_bound = max(0.0, round(pred - 1.28 * std_dev, 1)) # 80% empirical bound
                upper_bound = max(pred, round(pred + 1.28 * std_dev, 1))

                forecast_rows.append({
                    'location_id': loc_id,
                    'product_id': prod_id,
                    'product_name': group['product_name'].iloc[0] if 'product_name' in group.columns else prod_id,
                    'business_type': group['business_type'].iloc[0] if 'business_type' in group.columns else 'Unknown',
                    'forecast_date': target_date.strftime('%Y-%m-%d'),
                    'day_of_week': int(target_dow),
                    'horizon_day': day_offset,
                    'predicted_units': pred,
                    'lower_bound': lower_bound,
                    'upper_bound': upper_bound,
                    'method': 'Seasonal-Naïve Baseline'
                })

        return forecast_rows
