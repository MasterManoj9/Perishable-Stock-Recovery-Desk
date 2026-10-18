"""
Data Ingestion, Validation, and Quality Profiling Engine
FYND Predict - AI Demand Intelligence
"""

import os
import io
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple


CANONICAL_COLUMNS = {
    'date': ['date', 'transaction_date', 'timestamp', 'day', 'order_date'],
    'location_id': ['location_id', 'store_id', 'outlet_id', 'branch_id'],
    'product_id': ['product_id', 'sku', 'item_id', 'item_code'],
    'units_sold': ['units_sold', 'quantity', 'qty', 'units', 'demand_units', 'sales_units'],
    'product_name': ['product_name', 'name', 'item_name', 'description'],
    'business_type': ['business_type', 'store_type', 'outlet_type', 'channel'],
    'category': ['category', 'product_category', 'dept', 'department'],
    'selling_price': ['selling_price_inr', 'selling_price', 'price', 'unit_price'],
    'unit_cost': ['unit_cost_inr', 'unit_cost', 'cost', 'cogs_unit'],
    'footfall_visits': ['footfall_visits', 'footfall', 'visitors', 'traffic'],
    'promotion_flag': ['promotion_flag_0_1', 'promotion', 'is_promo', 'promo']
}

REQUIRED_CANONICAL = ['date', 'location_id', 'product_id', 'units_sold']


class DataValidator:
    """Validates, profiles, and reports on sales and demand datasets."""

    def __init__(self, mapping_override: Optional[Dict[str, str]] = None):
        self.mapping_override = mapping_override or {}

    def infer_column_mapping(self, columns: List[str]) -> Dict[str, str]:
        """Automatically maps dataset columns to canonical field names."""
        mapping = {}
        normalized_cols = {c.strip().lower().replace(' ', '_').replace('-', '_'): c for c in columns}

        # Apply user overrides first
        for canonical, actual in self.mapping_override.items():
            if actual in columns:
                mapping[canonical] = actual

        for canonical, aliases in CANONICAL_COLUMNS.items():
            if canonical in mapping:
                continue
            for alias in aliases:
                norm_alias = alias.lower().replace(' ', '_').replace('-', '_')
                if norm_alias in normalized_cols:
                    mapping[canonical] = normalized_cols[norm_alias]
                    break

        return mapping

    def validate_file(self, file_content_or_path: Any, filename: str = '') -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Reads CSV or Excel, maps columns, and performs thorough validation."""
        report = {
            'valid': False,
            'filename': filename,
            'total_rows': 0,
            'valid_rows': 0,
            'mapping': {},
            'missing_required_fields': [],
            'date_range': None,
            'distinct_locations': [],
            'distinct_products': [],
            'distinct_business_types': [],
            'anomalies': [],
            'warnings': [],
            'quality_score': 0.0,
            'column_stats': {}
        }

        # 1. Load DataFrame
        try:
            if isinstance(file_content_or_path, (str, os.PathLike)):
                filename = filename or str(file_content_or_path)
                if filename.endswith('.xlsx') or filename.endswith('.xls'):
                    df = pd.read_excel(file_content_or_path)
                else:
                    df = pd.read_csv(file_content_or_path, encoding_errors='replace')
            elif isinstance(file_content_or_path, bytes):
                if filename.endswith('.xlsx') or filename.endswith('.xls'):
                    df = pd.read_excel(io.BytesIO(file_content_or_path))
                else:
                    df = pd.read_csv(io.BytesIO(file_content_or_path), encoding_errors='replace')
            elif isinstance(file_content_or_path, pd.DataFrame):
                df = file_content_or_path.copy()
            else:
                report['anomalies'].append({'type': 'IO_ERROR', 'message': 'Unsupported data input type.'})
                return pd.DataFrame(), report
        except Exception as e:
            report['anomalies'].append({'type': 'READ_ERROR', 'message': f'Failed to parse file: {str(e)}'})
            return pd.DataFrame(), report

        report['total_rows'] = len(df)
        if len(df) == 0:
            report['anomalies'].append({'type': 'EMPTY_FILE', 'message': 'Dataset contains zero rows.'})
            return df, report

        # 2. Column Mapping
        mapping = self.infer_column_mapping(list(df.columns))
        report['mapping'] = mapping

        missing_req = [req for req in REQUIRED_CANONICAL if req not in mapping]
        report['missing_required_fields'] = missing_req
        if missing_req:
            report['anomalies'].append({
                'type': 'MISSING_COLUMNS',
                'message': f'Missing required canonical columns: {", ".join(missing_req)}'
            })
            return df, report

        # 3. Canonical DataFrame creation
        canon_df = pd.DataFrame()
        for canonical, source_col in mapping.items():
            canon_df[canonical] = df[source_col]

        # 4. Validate and Parse Dates
        try:
            canon_df['date'] = pd.to_datetime(canon_df['date'], errors='coerce')
            invalid_dates_count = int(canon_df['date'].isna().sum())
            if invalid_dates_count > 0:
                report['warnings'].append(f'{invalid_dates_count} rows have invalid or unparseable timestamps.')
                report['anomalies'].append({
                    'type': 'INVALID_TIMESTAMP',
                    'count': invalid_dates_count,
                    'message': f'{invalid_dates_count} records contain unparseable dates.'
                })
        except Exception as e:
            report['anomalies'].append({'type': 'DATE_PARSE_ERROR', 'message': str(e)})
            return canon_df, report

        # Date range summary
        valid_dates = canon_df['date'].dropna()
        if len(valid_dates) > 0:
            min_date = valid_dates.min().strftime('%Y-%m-%d')
            max_date = valid_dates.max().strftime('%Y-%m-%d')
            date_span_days = (valid_dates.max() - valid_dates.min()).days + 1
            report['date_range'] = {
                'start': min_date,
                'end': max_date,
                'span_days': int(date_span_days),
                'distinct_days_observed': int(valid_dates.dt.date.nunique())
            }
            if date_span_days < 14:
                report['warnings'].append(f'Dataset covers only {date_span_days} days. Minimum recommended for weekly seasonality is 28+ days.')

        # 5. Validate Target (Units Sold)
        canon_df['units_sold'] = pd.to_numeric(canon_df['units_sold'], errors='coerce')
        nan_units = int(canon_df['units_sold'].isna().sum())
        negative_units = int((canon_df['units_sold'] < 0).sum())
        if nan_units > 0:
            report['warnings'].append(f'{nan_units} rows contain missing or non-numeric units sold.')
        if negative_units > 0:
            report['warnings'].append(f'{negative_units} rows have negative quantities (possible returns or corrections).')
            report['anomalies'].append({
                'type': 'NEGATIVE_QUANTITIES',
                'count': negative_units,
                'message': 'Negative quantities detected. Treated as returns/adjustments in evaluation.'
            })

        # Outlier diagnostics (IQR)
        units_clean = canon_df['units_sold'].dropna()
        if len(units_clean) > 0:
            q25 = float(units_clean.quantile(0.25))
            q75 = float(units_clean.quantile(0.75))
            iqr = q75 - q25
            upper_bound = q75 + (3.0 * iqr) # extreme threshold
            extreme_outliers = int((units_clean > upper_bound).sum())
            if extreme_outliers > 0:
                report['warnings'].append(
                    f'Diagnostic: {extreme_outliers} rows exceed extreme upper bound (> {upper_bound:.1f} units). Preserved without deletion.'
                )

        # 6. Dimensions and Categoricals
        canon_df['location_id'] = canon_df['location_id'].astype(str).str.strip()
        canon_df['product_id'] = canon_df['product_id'].astype(str).str.strip()

        if 'business_type' in canon_df.columns:
            canon_df['business_type'] = canon_df['business_type'].astype(str).str.strip().str.capitalize()
            report['distinct_business_types'] = sorted(list(canon_df['business_type'].unique()))

        report['distinct_locations'] = sorted(list(canon_df['location_id'].unique()))
        report['distinct_products'] = sorted(list(canon_df['product_id'].unique()))

        # 7. Check for conflicting product names
        if 'product_name' in canon_df.columns:
            name_counts = canon_df.groupby('product_id')['product_name'].nunique()
            conflicts = name_counts[name_counts > 1]
            if len(conflicts) > 0:
                report['warnings'].append(f'Product IDs with conflicting names: {list(conflicts.index)}')

        # 8. Check product-store series observations
        series_counts = canon_df.groupby(['location_id', 'product_id']).size()
        short_series = series_counts[series_counts < 14]
        if len(short_series) > 0:
            report['warnings'].append(f'{len(short_series)} store-product series have fewer than 14 observations.')

        # 9. Duplicate composite check (location_id, product_id, date)
        valid_rows = canon_df.dropna(subset=['date', 'location_id', 'product_id', 'units_sold'])
        duplicates = int(valid_rows.duplicated(subset=['date', 'location_id', 'product_id']).sum())
        if duplicates > 0:
            report['warnings'].append(f'{duplicates} duplicate records found for the same location, product, and date.')
            report['anomalies'].append({
                'type': 'DUPLICATE_INTERVALS',
                'count': duplicates,
                'message': 'Duplicate series intervals detected. Preprocessor will aggregate by sum.'
            })

        # 10. Quality Score Calculation (0 - 100)
        valid_count = len(valid_rows)
        report['valid_rows'] = valid_count
        base_score = 100.0
        if report['total_rows'] > 0:
            unparseable_penalty = (invalid_dates_count + nan_units) / report['total_rows'] * 40.0
            neg_penalty = min(15.0, (negative_units / report['total_rows']) * 30.0)
            dup_penalty = min(15.0, (duplicates / report['total_rows']) * 30.0)
            span_penalty = 15.0 if (report['date_range'] and report['date_range']['span_days'] < 28) else 0.0
            report['quality_score'] = max(0.0, round(base_score - unparseable_penalty - neg_penalty - dup_penalty - span_penalty, 1))

        # Overall validation pass
        report['valid'] = (len(missing_req) == 0 and valid_count > 0 and report['quality_score'] >= 50.0)

        return canon_df, report
