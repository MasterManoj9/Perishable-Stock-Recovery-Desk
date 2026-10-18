"""
Model C: Global Gradient Boosting Regressor
FYND Predict - AI Demand Intelligence
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.preprocessing import OrdinalEncoder


FEATURE_COLUMNS = [
    'location_code',
    'product_code',
    'business_type_code',
    'day_of_week',
    'is_weekend',
    'day_of_month',
    'month',
    'lag_1',
    'lag_2',
    'lag_3',
    'lag_7',
    'lag_14',
    'rolling_mean_7',
    'rolling_std_7',
    'rolling_mean_14',
    'trend_ratio_7_14',
    'same_weekday_4w_mean'
]

CATEGORICAL_FEATURES = ['location_code', 'product_code', 'business_type_code']


class GradientBoostingDemandModel:
    """
    Candidate Model C: Global Histogram Gradient Boosting Regressor.
    Trains across all product-store series with categorical embeddings, autoregressive lags,
    and rolling features. Features non-negative constraint and true empirical prediction intervals.
    """

    def __init__(
        self,
        max_iter: int = 150,
        learning_rate: float = 0.05,
        max_depth: int = 5,
        random_state: int = 42
    ):
        self.name = "Global Gradient Boosting Regressor"
        self.family = "gradient_boosting"
        self.max_iter = max_iter
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.random_state = random_state

        self.encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
        self.cat_cols = ['location_id', 'product_id', 'business_type']

        # Median / mean model
        self.model = HistGradientBoostingRegressor(
            loss='squared_error',
            max_iter=self.max_iter,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            categorical_features=[0, 1, 2],
            random_state=self.random_state,
            min_samples_leaf=5
        )

        # Quantile lower bound (10th percentile)
        self.model_lower = HistGradientBoostingRegressor(
            loss='quantile',
            quantile=0.10,
            max_iter=self.max_iter,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            categorical_features=[0, 1, 2],
            random_state=self.random_state,
            min_samples_leaf=5
        )

        # Quantile upper bound (90th percentile)
        self.model_upper = HistGradientBoostingRegressor(
            loss='quantile',
            quantile=0.90,
            max_iter=self.max_iter,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            categorical_features=[0, 1, 2],
            random_state=self.random_state,
            min_samples_leaf=5
        )

        self.fitted_ = False
        self.feature_names_ = FEATURE_COLUMNS
        self.hyperparameters = {
            'max_iter': max_iter,
            'learning_rate': learning_rate,
            'max_depth': max_depth,
            'random_state': random_state
        }

    def _encode_categoricals(self, df: pd.DataFrame, fit: bool = False) -> pd.DataFrame:
        """Transforms string categorical fields into integer ordinal codes."""
        df = df.copy()
        for col in self.cat_cols:
            if col not in df.columns:
                df[col] = 'Unknown'

        if fit:
            encoded = self.encoder.fit_transform(df[self.cat_cols])
        else:
            encoded = self.encoder.transform(df[self.cat_cols])

        df['location_code'] = encoded[:, 0]
        df['product_code'] = encoded[:, 1]
        df['business_type_code'] = encoded[:, 2]
        return df

    def fit(self, train_df: pd.DataFrame) -> "GradientBoostingDemandModel":
        """Fits the median model and prediction interval models on historical training observations."""
        encoded_df = self._encode_categoricals(train_df, fit=True)
        X = encoded_df[FEATURE_COLUMNS]
        y = encoded_df['units_sold'].to_numpy()

        # Fit main point estimator
        self.model.fit(X, y)

        # Fit empirical prediction intervals
        self.model_lower.fit(X, y)
        self.model_upper.fit(X, y)

        self.fitted_ = True
        return self

    def predict_eval(self, val_df: pd.DataFrame) -> np.ndarray:
        """Generates point estimates for the validation holdout set."""
        if not self.fitted_:
            raise RuntimeError("Model is not fitted.")
        encoded_df = self._encode_categoricals(val_df, fit=False)
        X = encoded_df[FEATURE_COLUMNS]
        raw_preds = self.model.predict(X)
        return np.maximum(0.0, np.round(raw_preds, 2))

    def predict_with_intervals(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Generates point predictions alongside lower (p10) and upper (p90) bounds."""
        encoded_df = self._encode_categoricals(df, fit=False)
        X = encoded_df[FEATURE_COLUMNS]

        point_preds = np.maximum(0.0, np.round(self.model.predict(X), 1))
        lower_preds = np.maximum(0.0, np.round(self.model_lower.predict(X), 1))
        upper_preds = np.maximum(point_preds, np.round(self.model_upper.predict(X), 1))

        # Guarantee lower <= point <= upper
        lower_preds = np.minimum(lower_preds, point_preds)
        return point_preds, lower_preds, upper_preds

    def forecast_horizon(
        self,
        full_history_df: pd.DataFrame,
        horizon_days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Generates recursive 7-day out-of-sample forward forecasts for each store-product series.
        Updates lags dynamically as predictions are made forward in time.
        """
        if not self.fitted_:
            raise RuntimeError("Model is not fitted.")

        forecast_rows = []
        max_date = pd.to_datetime(full_history_df['date']).max()

        for (loc_id, prod_id), group in full_history_df.groupby(['location_id', 'product_id']):
            series_history = group.sort_values('date').copy()
            meta_name = series_history['product_name'].iloc[0] if 'product_name' in series_history.columns else prod_id
            meta_type = series_history['business_type'].iloc[0] if 'business_type' in series_history.columns else 'Unknown'

            # Recent sales buffer (last 28 days of units_sold)
            recent_sales = list(series_history['units_sold'].tail(35).to_numpy())
            recent_dates = list(pd.to_datetime(series_history['date'].tail(35)))

            for offset in range(1, horizon_days + 1):
                target_date = max_date + pd.Timedelta(days=offset)
                dow = int(target_date.dayofweek)
                is_wknd = 1 if dow in [5, 6] else 0

                # Derive lags from recent_sales buffer
                l1 = recent_sales[-1] if len(recent_sales) >= 1 else 0.0
                l2 = recent_sales[-2] if len(recent_sales) >= 2 else l1
                l3 = recent_sales[-3] if len(recent_sales) >= 3 else l2
                l7 = recent_sales[-7] if len(recent_sales) >= 7 else l1
                l14 = recent_sales[-14] if len(recent_sales) >= 14 else l7

                # Rolling stats over trailing window
                trail_7 = recent_sales[-7:]
                r_mean7 = float(np.mean(trail_7))
                r_std7 = float(np.std(trail_7)) if len(trail_7) > 1 else 0.0

                trail_14 = recent_sales[-14:]
                r_mean14 = float(np.mean(trail_14))
                trend_ratio = (r_mean7 / r_mean14) if r_mean14 > 0 else 1.0

                # Same weekday 4-week average
                same_dow_vals = [
                    recent_sales[-(7 * k)]
                    for k in [1, 2, 3, 4]
                    if len(recent_sales) >= 7 * k
                ]
                same_dow_mean = float(np.mean(same_dow_vals)) if same_dow_vals else r_mean7

                feature_row = pd.DataFrame([{
                    'location_id': loc_id,
                    'product_id': prod_id,
                    'business_type': meta_type,
                    'day_of_week': dow,
                    'is_weekend': is_wknd,
                    'day_of_month': target_date.day,
                    'month': target_date.month,
                    'lag_1': l1,
                    'lag_2': l2,
                    'lag_3': l3,
                    'lag_7': l7,
                    'lag_14': l14,
                    'rolling_mean_7': r_mean7,
                    'rolling_std_7': r_std7,
                    'rolling_mean_14': r_mean14,
                    'trend_ratio_7_14': trend_ratio,
                    'same_weekday_4w_mean': same_dow_mean
                }])

                point, low, high = self.predict_with_intervals(feature_row)
                pred_val = float(point[0])
                low_val = float(low[0])
                high_val = float(high[0])

                forecast_rows.append({
                    'location_id': loc_id,
                    'product_id': prod_id,
                    'product_name': meta_name,
                    'business_type': meta_type,
                    'forecast_date': target_date.strftime('%Y-%m-%d'),
                    'day_of_week': dow,
                    'horizon_day': offset,
                    'predicted_units': pred_val,
                    'lower_bound': low_val,
                    'upper_bound': high_val,
                    'method': 'Global Gradient Boosting'
                })

                # Append recursive prediction to buffer for next step
                recent_sales.append(pred_val)
                recent_dates.append(target_date)

        return forecast_rows
