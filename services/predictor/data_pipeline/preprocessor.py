"""
Time-Series Feature Engineering and Preprocessing Pipeline
FYND Predict - AI Demand Intelligence
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Optional


class FeaturePipeline:
    """Constructs leak-free time features, autoregressive lags, and rolling aggregations."""

    def __init__(self, horizon_days: int = 7):
        self.horizon_days = horizon_days
        self.metadata = {}
        self.series_metadata = {}

    def aggregate_daily(self, df: pd.DataFrame) -> pd.DataFrame:
        """Aggregates raw transaction records into canonical daily store-product series."""
        # Ensure proper types
        df = df.copy()
        df['date'] = pd.to_datetime(df['date']).dt.floor('D')
        df['units_sold'] = pd.to_numeric(df['units_sold'], errors='coerce').fillna(0)

        group_cols = ['date', 'location_id', 'product_id']

        # Aggregation dictionary
        agg_dict = {'units_sold': 'sum'}

        optional_first_cols = ['product_name', 'business_type', 'category', 'selling_price', 'unit_cost']
        for col in optional_first_cols:
            if col in df.columns:
                agg_dict[col] = 'first'

        daily_df = df.groupby(group_cols, as_index=False).agg(agg_dict)
        return daily_df.sort_values(by=['location_id', 'product_id', 'date']).reset_index(drop=True)

    def regularize_series(self, daily_df: pd.DataFrame) -> pd.DataFrame:
        """Fills missing intermediate calendar dates with 0 units sold for active series."""
        all_series = []

        # Find global date bounds or per-series bounds
        for (loc_id, prod_id), group in daily_df.groupby(['location_id', 'product_id']):
            group = group.sort_values('date').set_index('date')
            start_date = group.index.min()
            end_date = group.index.max()

            # Continuous daily date range
            full_idx = pd.date_range(start=start_date, end=end_date, freq='D')
            reindexed = group.reindex(full_idx)
            reindexed['location_id'] = loc_id
            reindexed['product_id'] = prod_id
            reindexed['units_sold'] = reindexed['units_sold'].fillna(0)

            # Forward/backward fill static metadata
            for col in ['product_name', 'business_type', 'category', 'selling_price', 'unit_cost']:
                if col in reindexed.columns:
                    reindexed[col] = reindexed[col].bfill().ffill()

            reindexed = reindexed.reset_index().rename(columns={'index': 'date'})
            all_series.append(reindexed)

        result_df = pd.concat(all_series, ignore_index=True)
        return result_df.sort_values(by=['location_id', 'product_id', 'date']).reset_index(drop=True)

    def extract_calendar_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extracts deterministic calendar signals."""
        df = df.copy()
        dates = pd.to_datetime(df['date'])
        df['day_of_week'] = dates.dt.dayofweek  # 0 = Monday, 6 = Sunday
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['day_of_month'] = dates.dt.day
        df['month'] = dates.dt.month
        df['week_of_year'] = dates.dt.isocalendar().week.astype(int)
        return df

    def compute_lags_and_rolling(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates autoregressive lags and rolling statistics with strict target isolation.
        All rolling windows use shift(1) to ensure the current day's sales never leak into features.
        """
        df = df.copy()
        enhanced_series = []

        for (loc_id, prod_id), group in df.groupby(['location_id', 'product_id']):
            group = group.sort_values('date').copy()
            sales = group['units_sold']

            # 1. Autoregressive lags
            group['lag_1'] = sales.shift(1)
            group['lag_2'] = sales.shift(2)
            group['lag_3'] = sales.shift(3)
            group['lag_7'] = sales.shift(7)   # Same weekday last week
            group['lag_14'] = sales.shift(14) # Same weekday two weeks ago

            # 2. Rolling window features strictly shifted by 1
            shifted_sales = sales.shift(1)
            group['rolling_mean_7'] = shifted_sales.rolling(window=7, min_periods=2).mean()
            group['rolling_std_7'] = shifted_sales.rolling(window=7, min_periods=2).std().fillna(0)
            group['rolling_min_7'] = shifted_sales.rolling(window=7, min_periods=2).min()
            group['rolling_max_7'] = shifted_sales.rolling(window=7, min_periods=2).max()

            group['rolling_mean_14'] = shifted_sales.rolling(window=14, min_periods=4).mean()
            group['rolling_std_14'] = shifted_sales.rolling(window=14, min_periods=4).std().fillna(0)

            # Trend indicator: ratio of 7d mean to 14d mean
            group['trend_ratio_7_14'] = np.where(
                group['rolling_mean_14'] > 0,
                group['rolling_mean_7'] / group['rolling_mean_14'],
                1.0
            )

            # Same-day-of-week 4-week historical average (for seasonal naive comparison)
            # Shifts by 7, 14, 21, 28
            same_day_history = pd.concat([sales.shift(7), sales.shift(14), sales.shift(21), sales.shift(28)], axis=1)
            group['same_weekday_4w_mean'] = same_day_history.mean(axis=1)

            enhanced_series.append(group)

        result_df = pd.concat(enhanced_series, ignore_index=True)
        return result_df.sort_values(by=['location_id', 'product_id', 'date']).reset_index(drop=True)

    def prepare_dataset(self, raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Executes full canonical ingestion, date-regularization, calendar features, and lags."""
        daily_df = self.aggregate_daily(raw_df)
        reg_df = self.regularize_series(daily_df)
        cal_df = self.extract_calendar_features(reg_df)
        feature_df = self.compute_lags_and_rolling(cal_df)

        summary = {
            'total_series': int(reg_df.groupby(['location_id', 'product_id']).ngroups),
            'total_observations': len(feature_df),
            'min_date': feature_df['date'].min().strftime('%Y-%m-%d'),
            'max_date': feature_df['date'].max().strftime('%Y-%m-%d'),
            'total_units_sold': float(feature_df['units_sold'].sum())
        }
        return feature_df, summary
