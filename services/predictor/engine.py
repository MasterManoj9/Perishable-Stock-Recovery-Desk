"""
Training and Forecasting Engine Coordinator
FYND Predict - AI Demand Intelligence
"""

import os
import uuid
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from services.predictor.data_pipeline.validator import DataValidator
from services.predictor.data_pipeline.preprocessor import FeaturePipeline
from services.predictor.data_pipeline.chronological_split import split_chronological
from services.predictor.models.evaluator import evaluate_predictions, evaluate_by_series
from services.predictor.models.baseline_snaive import SeasonalNaiveModel
from services.predictor.models.baseline_ma import MovingAverageModel
from services.predictor.models.candidate_ml import GradientBoostingDemandModel, FEATURE_COLUMNS
from services.predictor.models.registry import ModelRegistry


class ForecastingEngine:
    """Orchestrates end-to-end dataset validation, chronological training, benchmarking, and forecast generation."""

    def __init__(self, artifacts_dir: Optional[str] = None):
        if artifacts_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            artifacts_dir = os.path.join(base_dir, "artifacts")
        self.registry = ModelRegistry(storage_dir=artifacts_dir)
        self.pipeline = FeaturePipeline(horizon_days=7)
        self.cached_results = None

    def validate_dataset(self, file_path_or_content: Any, filename: str = '') -> Dict[str, Any]:
        """Performs comprehensive schema validation and anomaly profiling."""
        validator = DataValidator()
        _, report = validator.validate_file(file_path_or_content, filename=filename)
        return report

    def run_training_pipeline(
        self,
        dataset_path_or_df: Any,
        holdout_days: int = 14,
        dataset_version: str = "C30-90D-v1.0"
    ) -> Dict[str, Any]:
        """
        Executes full verifiable training pipeline:
        1. Ingestion & Validation
        2. Feature Engineering & Lags
        3. Strict Chronological Holdout Split
        4. Model A (Seasonal-Naïve) Training & Evaluation
        5. Model B (Moving Average) Training & Evaluation
        6. Model C (Gradient Boosting) Training & Evaluation
        7. Model Selection & Serialization
        8. 7-Day Out-of-Sample Forward Forecast Generation
        9. Explainable Recommendations & Heatmaps
        """
        run_id = f"run_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

        # 1. Validation
        validator = DataValidator()
        canon_df, val_report = validator.validate_file(dataset_path_or_df)
        if not val_report['valid']:
            return {
                'run_id': run_id,
                'status': 'failed',
                'error': 'Dataset failed validation rules.',
                'validation_report': val_report
            }

        # 2. Preprocessing and feature construction
        feature_df, prep_summary = self.pipeline.prepare_dataset(canon_df)

        # 3. Chronological split (14-day holdout)
        train_df, val_df, split_info = split_chronological(feature_df, holdout_days=holdout_days)

        if len(train_df) == 0 or len(val_df) == 0:
            return {
                'run_id': run_id,
                'status': 'failed',
                'error': f'Insufficient observations for a {holdout_days}-day chronological split.',
                'split_info': split_info
            }

        y_val_actual = val_df['units_sold'].to_numpy()

        # 4. Model A: Seasonal-Naïve Baseline
        model_a = SeasonalNaiveModel()
        model_a.fit(train_df)
        preds_a = model_a.predict_eval(val_df)
        metrics_a = evaluate_predictions(y_val_actual, preds_a)

        # 5. Model B: 7-Day Moving Average Baseline
        model_b = MovingAverageModel(window_days=7)
        model_b.fit(train_df)
        preds_b = model_b.predict_eval(val_df)
        metrics_b = evaluate_predictions(y_val_actual, preds_b)

        # Benchmark baseline (choose the better baseline as reference)
        best_baseline_mae = min(metrics_a['mae'], metrics_b['mae'])
        baseline_model_name = model_a.name if metrics_a['mae'] <= metrics_b['mae'] else model_b.name

        # 6. Model C: Candidate Machine Learning (HistGradientBoosting)
        model_c = GradientBoostingDemandModel(max_iter=150, learning_rate=0.05, max_depth=5)
        model_c.fit(train_df)
        preds_c = model_c.predict_eval(val_df)
        metrics_c = evaluate_predictions(y_val_actual, preds_c, baseline_mae=best_baseline_mae)

        # 7. Model Selection Policy
        model_comparison = [
            {
                'model_name': model_a.name,
                'family': model_a.family,
                'mae': metrics_a['mae'],
                'wape_pct': metrics_a['wape_pct'],
                'rmse': metrics_a['rmse'],
                'baseline_lift_pct': 0.0,
                'is_selected': False,
                'notes': 'Heuristic weekday seasonal pattern'
            },
            {
                'model_name': model_b.name,
                'family': model_b.family,
                'mae': metrics_b['mae'],
                'wape_pct': metrics_b['wape_pct'],
                'rmse': metrics_b['rmse'],
                'baseline_lift_pct': round(((metrics_a['mae'] - metrics_b['mae']) / metrics_a['mae']) * 100.0, 2) if metrics_a['mae'] > 0 else 0.0,
                'is_selected': False,
                'notes': 'Trailing 7-day average sales volume'
            },
            {
                'model_name': model_c.name,
                'family': model_c.family,
                'mae': metrics_c['mae'],
                'wape_pct': metrics_c['wape_pct'],
                'rmse': metrics_c['rmse'],
                'baseline_lift_pct': metrics_c['baseline_lift_pct'],
                'is_selected': False,
                'notes': 'Non-linear tree ensemble with lags & embeddings'
            }
        ]

        # Select model: Prefer Model C if it outperforms or matches the best baseline
        if metrics_c['mae'] <= best_baseline_mae:
            winning_model = model_c
            winning_meta = model_comparison[2]
            winning_meta['is_selected'] = True
            selection_reason = (
                f"Candidate Gradient Boosting outperformed baseline by {metrics_c['baseline_lift_pct']}% "
                f"(MAE {metrics_c['mae']} vs baseline {best_baseline_mae})."
            )
        else:
            # Baseline performed better: retain baseline
            winning_model = model_a if metrics_a['mae'] <= metrics_b['mae'] else model_b
            idx = 0 if metrics_a['mae'] <= metrics_b['mae'] else 1
            winning_meta = model_comparison[idx]
            winning_meta['is_selected'] = True
            selection_reason = (
                f"Baseline {winning_model.name} retained because candidate ML did not demonstrate "
                f"superior generalization on the 14-day holdout."
            )

        # 8. Persist Winning Model Artifact
        model_id = f"model_{winning_model.family}_{run_id}"
        metadata_record = {
            'model_name': winning_model.name,
            'model_family': winning_model.family,
            'training_run_id': run_id,
            'dataset_version': dataset_version,
            'validation_metrics': metrics_c if winning_model == model_c else (metrics_a if winning_model == model_a else metrics_b),
            'feature_schema': FEATURE_COLUMNS if winning_model == model_c else ['day_of_week', 'units_sold'],
            'hyperparameters': getattr(winning_model, 'hyperparameters', {})
        }
        artifact_path = self.registry.save_model(model_id, winning_model, metadata_record, is_selected=True)

        # 9. Generate 7-Day Forward Forecast
        # Use full historical observations to prime the forward window
        forecast_rows = winning_model.forecast_horizon(feature_df, horizon_days=7)

        # 10. Generate Series-Level Backtest Detail
        val_df_with_preds = val_df.copy()
        val_df_with_preds['predicted_units'] = preds_c if winning_model == model_c else (preds_a if winning_model == model_a else preds_b)
        val_df_with_preds['abs_error'] = np.abs(val_df_with_preds['units_sold'] - val_df_with_preds['predicted_units'])
        series_eval = evaluate_by_series(val_df_with_preds)

        # 11b. Build historical timeline for visualization (last 28 days of history)
        max_date = feature_df['date'].max()
        history_start = max_date - pd.Timedelta(days=27)
        recent_history = feature_df[feature_df['date'] >= history_start].copy()
        val_pred_map = {
            (r['location_id'], r['product_id'], r['date'].strftime('%Y-%m-%d')): float(r['predicted_units'])
            for _, r in val_df_with_preds.iterrows()
        }

        historical_timeline = []
        for _, r in recent_history.iterrows():
            d_str = r['date'].strftime('%Y-%m-%d')
            pred_val = val_pred_map.get((r['location_id'], r['product_id'], d_str), None)
            historical_timeline.append({
                'date': d_str,
                'location_id': r['location_id'],
                'product_id': r['product_id'],
                'product_name': r['product_name'] if 'product_name' in r else r['product_id'],
                'business_type': r['business_type'] if 'business_type' in r else 'Unknown',
                'units_sold': float(r['units_sold']),
                'validation_predicted_units': pred_val,
                'is_holdout': pred_val is not None
            })

        # 11. Demand Insights & Explainable Recommendations
        insights = self._compute_insights(feature_df, forecast_rows, series_eval)

        training_result = {
            'run_id': run_id,
            'status': 'completed',
            'trained_at': datetime.utcnow().isoformat() + "Z",
            'model_id': model_id,
            'selected_model': winning_model.name,
            'selection_reason': selection_reason,
            'split_info': split_info,
            'validation_report': val_report,
            'model_comparison': model_comparison,
            'series_eval': series_eval,
            'forecast_rows': forecast_rows,
            'historical_timeline': historical_timeline,
            'insights': insights,
            'summary_kpis': {
                'total_forecast_7d_units': round(sum(r['predicted_units'] for r in forecast_rows), 1),
                'total_observed_units': prep_summary['total_units_sold'],
                'validation_mae': winning_meta['mae'],
                'validation_wape_pct': winning_meta['wape_pct'],
                'validation_rmse': winning_meta['rmse'],
                'baseline_lift_pct': winning_meta['baseline_lift_pct'],
                'quality_score': val_report['quality_score'],
                'active_locations_count': len(val_report['distinct_locations']),
                'active_products_count': len(val_report['distinct_products'])
            }
        }

        self.cached_results = training_result
        return training_result

    def _compute_insights(
        self,
        history_df: pd.DataFrame,
        forecast_rows: List[Dict[str, Any]],
        series_eval: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Computes empirical peak periods, sales trends, rankings, and explainable recommendations."""
        dow_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

        # Weekday aggregation (Heatmap)
        dow_stats = []
        for dow_idx, dow_name in enumerate(dow_names):
            dow_rows = history_df[history_df['day_of_week'] == dow_idx]
            avg_units = float(dow_rows['units_sold'].mean()) if len(dow_rows) > 0 else 0.0
            tot_units = float(dow_rows['units_sold'].sum()) if len(dow_rows) > 0 else 0.0
            obs_count = len(dow_rows)

            dow_stats.append({
                'day_of_week': dow_idx,
                'day_name': dow_name,
                'avg_units_per_day': round(avg_units, 1),
                'total_units_sold': int(tot_units),
                'observations': obs_count
            })

        # Identify peak and low days
        sorted_dow = sorted(dow_stats, key=lambda x: x['avg_units_per_day'], reverse=True)
        peak_day = sorted_dow[0]['day_name'] if sorted_dow else 'N/A'
        low_day = sorted_dow[-1]['day_name'] if sorted_dow else 'N/A'

        # Product forecast rankings (sum over 7 days)
        prod_forecast = {}
        for row in forecast_rows:
            p_id = row['product_id']
            if p_id not in prod_forecast:
                prod_forecast[p_id] = {
                    'product_id': p_id,
                    'product_name': row['product_name'],
                    'business_type': row['business_type'],
                    'forecast_units_7d': 0.0,
                    'lower_bound_7d': 0.0,
                    'upper_bound_7d': 0.0
                }
            prod_forecast[p_id]['forecast_units_7d'] += row['predicted_units']
            prod_forecast[p_id]['lower_bound_7d'] += row['lower_bound']
            prod_forecast[p_id]['upper_bound_7d'] += row['upper_bound']

        for p_id in prod_forecast:
            prod_forecast[p_id]['forecast_units_7d'] = round(prod_forecast[p_id]['forecast_units_7d'], 1)
            prod_forecast[p_id]['lower_bound_7d'] = round(prod_forecast[p_id]['lower_bound_7d'], 1)
            prod_forecast[p_id]['upper_bound_7d'] = round(prod_forecast[p_id]['upper_bound_7d'], 1)

        ranked_products = sorted(prod_forecast.values(), key=lambda x: x['forecast_units_7d'], reverse=True)

        # Explainable Recommendations (Deterministic, strictly evidence-backed)
        recommendations = []

        # Rec 1: Peak Day Inventory Planning
        recommendations.append({
            'title': f'Prepare Higher Inventory Allocation for {peak_day}',
            'category': 'Procurement & Prep',
            'severity': 'high',
            'explanation': (
                f"Historical observations show {peak_day} has the highest average daily sales volume "
                f"({sorted_dow[0]['avg_units_per_day']} units/day) across stores. Ensure morning preparation "
                f"and stock replenishment are completed prior to opening."
            ),
            'evidence': f"Empirical 90-day history: {sorted_dow[0]['total_units_sold']} units sold on {peak_day}s ({sorted_dow[0]['observations']} observations)."
        })

        # Rec 2: Low-Demand Day Waste Mitigation
        recommendations.append({
            'title': f'Calibrate Production Downward on {low_day}',
            'category': 'Waste Prevention',
            'severity': 'medium',
            'explanation': (
                f"Historical demand on {low_day} is lowest ({sorted_dow[-1]['avg_units_per_day']} units/day). "
                f"Reduce batch preparation quantities to prevent perishable overproduction and end-of-day expiry waste."
            ),
            'evidence': f"Empirical 90-day history: lowest velocity day across all locations."
        })

        # Rec 3: Top Forecast SKU
        if ranked_products:
            top_p = ranked_products[0]
            recommendations.append({
                'title': f"Top Velocity SKU: {top_p['product_name']}",
                'category': 'Demand Priority',
                'severity': 'info',
                'explanation': (
                    f"Model projects {top_p['forecast_units_7d']} units demand over next 7 days "
                    f"(80% prediction interval: {top_p['lower_bound_7d']} to {top_p['upper_bound_7d']} units). "
                    f"Prioritize supplier raw material checks for this high-velocity item."
                ),
                'evidence': f"Based on multi-series gradient boosting evaluation and recent 14-day sales momentum."
            })

        # Rec 4: Model Limitation Disclosures
        recommendations.append({
            'title': 'Operational Assumption & Data Limitation Notice',
            'category': 'Governance',
            'severity': 'caution',
            'explanation': (
                "Demand predictions reflect historical sales velocity. Without recorded unconstrained stockout "
                "or lead-time tracking, periods with stockouts may reflect suppressed sales rather than true latent demand."
            ),
            'evidence': "Standard retail forecasting boundary: observed transactions represent constrained sales."
        })

        return {
            'weekday_heatmap': dow_stats,
            'peak_day': peak_day,
            'low_day': low_day,
            'ranked_products': ranked_products,
            'recommendations': recommendations
        }
