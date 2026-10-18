"""
Model Evaluation and Comparison Metrics Engine
FYND Predict - AI Demand Intelligence
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional


def calculate_mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Computes Mean Absolute Error in unit demand."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean(np.abs(y_true - y_pred)))


def calculate_wape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Computes Weighted Absolute Percentage Error (WAPE %):
    WAPE = sum(|y_true - y_pred|) / sum(y_true) * 100%
    Handles zero total actual sales safely without ZeroDivisionError.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    total_actual = float(np.sum(y_true))
    total_abs_error = float(np.sum(np.abs(y_true - y_pred)))

    if total_actual == 0.0:
        return 0.0 if total_abs_error == 0.0 else 100.0

    return float(round((total_abs_error / total_actual) * 100.0, 2))


def calculate_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Computes Root Mean Squared Error."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def evaluate_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    baseline_mae: Optional[float] = None
) -> Dict[str, Any]:
    """Generates standard evaluation metrics and baseline improvement comparison."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.maximum(0.0, np.asarray(y_pred, dtype=float)) # enforce non-negative count demand

    mae = calculate_mae(y_true, y_pred)
    wape = calculate_wape(y_true, y_pred)
    rmse = calculate_rmse(y_true, y_pred)

    lift_pct = None
    if baseline_mae is not None and baseline_mae > 0:
        lift_pct = float(round(((baseline_mae - mae) / baseline_mae) * 100.0, 2))

    return {
        'mae': float(round(mae, 2)),
        'wape_pct': float(wape),
        'rmse': float(round(rmse, 2)),
        'sample_count': int(len(y_true)),
        'total_actual_units': float(round(np.sum(y_true), 1)),
        'total_predicted_units': float(round(np.sum(y_pred), 1)),
        'baseline_lift_pct': lift_pct
    }


def evaluate_by_series(
    eval_df: pd.DataFrame,
    actual_col: str = 'units_sold',
    pred_col: str = 'predicted_units'
) -> List[Dict[str, Any]]:
    """Breaks down evaluation metrics by (location_id, product_id)."""
    series_metrics = []
    for (loc_id, prod_id), group in eval_df.groupby(['location_id', 'product_id']):
        y_true = group[actual_col].to_numpy()
        y_pred = group[pred_col].to_numpy()
        metrics = evaluate_predictions(y_true, y_pred)
        series_metrics.append({
            'location_id': loc_id,
            'product_id': prod_id,
            'product_name': group['product_name'].iloc[0] if 'product_name' in group.columns else prod_id,
            'business_type': group['business_type'].iloc[0] if 'business_type' in group.columns else 'Unknown',
            'holdout_days': len(group),
            'mae': metrics['mae'],
            'wape_pct': metrics['wape_pct'],
            'rmse': metrics['rmse'],
            'actual_units': metrics['total_actual_units'],
            'predicted_units': metrics['total_predicted_units']
        })
    return series_metrics
