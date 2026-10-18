"""
Strict Chronological Train / Validation Splitter
FYND Predict - AI Demand Intelligence
"""

import pandas as pd
from typing import Tuple, Dict, Any


def split_chronological(
    df: pd.DataFrame,
    holdout_days: int = 14,
    min_history_days: int = 28
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Performs a strict chronological time-based split.
    Validation set comprises the most recent holdout_days observations.
    Never shuffles time-series rows.
    """
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'])
    max_date = df['date'].max()
    cutoff_date = max_date - pd.Timedelta(days=holdout_days - 1)

    # Filter out early rows where 14-day lags have not materialized
    clean_history_df = df.dropna(subset=['lag_1', 'lag_7', 'rolling_mean_7']).copy()

    train_df = clean_history_df[clean_history_df['date'] < cutoff_date].copy()
    val_df = clean_history_df[clean_history_df['date'] >= cutoff_date].copy()

    split_info = {
        'holdout_days': holdout_days,
        'cutoff_date': cutoff_date.strftime('%Y-%m-%d'),
        'train_start_date': train_df['date'].min().strftime('%Y-%m-%d') if len(train_df) > 0 else None,
        'train_end_date': train_df['date'].max().strftime('%Y-%m-%d') if len(train_df) > 0 else None,
        'val_start_date': val_df['date'].min().strftime('%Y-%m-%d') if len(val_df) > 0 else None,
        'val_end_date': val_df['date'].max().strftime('%Y-%m-%d') if len(val_df) > 0 else None,
        'train_samples': len(train_df),
        'val_samples': len(val_df),
        'unique_train_series': int(train_df.groupby(['location_id', 'product_id']).ngroups) if len(train_df) > 0 else 0,
        'unique_val_series': int(val_df.groupby(['location_id', 'product_id']).ngroups) if len(val_df) > 0 else 0
    }

    return train_df, val_df, split_info
