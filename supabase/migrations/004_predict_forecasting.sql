-- ============================================================================
-- FYND Predict — AI Demand Intelligence & Forecasting Schema Migration
-- Migration 004: Forecasting Tables, Artifact Tracking, and RLS Security
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. FORECAST DATASETS METADATA TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forecast_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size_bytes BIGINT,
    row_count INTEGER NOT NULL CHECK (row_count >= 0),
    column_count INTEGER NOT NULL CHECK (column_count >= 0),
    date_range_start DATE,
    date_range_end DATE,
    distinct_locations INTEGER NOT NULL DEFAULT 1,
    distinct_products INTEGER NOT NULL DEFAULT 1,
    quality_score NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
    fingerprint TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecast_datasets_created ON public.forecast_datasets (created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. FORECAST TRAINING RUNS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forecast_training_runs (
    id TEXT PRIMARY KEY, -- run_id e.g. run_20261018_...
    dataset_id UUID REFERENCES public.forecast_datasets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    selected_model_name TEXT,
    selection_reason TEXT,
    holdout_days INTEGER NOT NULL DEFAULT 14,
    train_start_date DATE,
    train_end_date DATE,
    val_start_date DATE,
    val_end_date DATE,
    train_sample_count INTEGER,
    val_sample_count INTEGER,
    metrics_summary JSONB,
    model_comparison JSONB,
    error_message TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_training_runs_created ON public.forecast_training_runs (created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. FORECAST MODEL VERSIONS (REGISTRY)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forecast_model_versions (
    id TEXT PRIMARY KEY, -- model_id
    run_id TEXT REFERENCES public.forecast_training_runs(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    model_family TEXT NOT NULL,
    validation_mae NUMERIC(8, 2) NOT NULL,
    validation_wape_pct NUMERIC(6, 2) NOT NULL,
    validation_rmse NUMERIC(8, 2) NOT NULL,
    baseline_lift_pct NUMERIC(6, 2),
    is_active BOOLEAN NOT NULL DEFAULT false,
    artifact_path TEXT,
    hyperparameters JSONB,
    feature_schema JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_versions_active ON public.forecast_model_versions (is_active);

-- ----------------------------------------------------------------------------
-- 4. FORECAST PREDICTIONS RESULTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forecast_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT REFERENCES public.forecast_model_versions(id) ON DELETE SET NULL,
    run_id TEXT REFERENCES public.forecast_training_runs(id) ON DELETE CASCADE,
    location_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT,
    business_type TEXT,
    forecast_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    horizon_day INTEGER NOT NULL CHECK (horizon_day BETWEEN 1 AND 30),
    predicted_units NUMERIC(8, 2) NOT NULL CHECK (predicted_units >= 0),
    lower_bound NUMERIC(8, 2) CHECK (lower_bound >= 0),
    upper_bound NUMERIC(8, 2) CHECK (upper_bound >= 0),
    actual_units NUMERIC(8, 2), -- Populated retroactively for live accuracy tracking
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecast_results_lookup ON public.forecast_results (location_id, product_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_forecast_results_date ON public.forecast_results (forecast_date);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.forecast_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_results ENABLE ROW LEVEL SECURITY;

-- Helper security function: is user manager or admin?
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Forecast Datasets Policy
DROP POLICY IF EXISTS "Managers and admins can view forecast datasets" ON public.forecast_datasets;
CREATE POLICY "Managers and admins can view forecast datasets"
    ON public.forecast_datasets FOR SELECT
    TO authenticated
    USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS "Managers and admins can insert forecast datasets" ON public.forecast_datasets;
CREATE POLICY "Managers and admins can insert forecast datasets"
    ON public.forecast_datasets FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager_or_admin());

-- Training Runs Policy
DROP POLICY IF EXISTS "Managers and admins can view training runs" ON public.forecast_training_runs;
CREATE POLICY "Managers and admins can view training runs"
    ON public.forecast_training_runs FOR SELECT
    TO authenticated
    USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS "Managers and admins can manage training runs" ON public.forecast_training_runs;
CREATE POLICY "Managers and admins can manage training runs"
    ON public.forecast_training_runs FOR ALL
    TO authenticated
    USING (public.is_manager_or_admin())
    WITH CHECK (public.is_manager_or_admin());

-- Model Versions Policy
DROP POLICY IF EXISTS "Managers and admins can view model versions" ON public.forecast_model_versions;
CREATE POLICY "Managers and admins can view model versions"
    ON public.forecast_model_versions FOR SELECT
    TO authenticated
    USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS "Managers and admins can manage model versions" ON public.forecast_model_versions;
CREATE POLICY "Managers and admins can manage model versions"
    ON public.forecast_model_versions FOR ALL
    TO authenticated
    USING (public.is_manager_or_admin())
    WITH CHECK (public.is_manager_or_admin());

-- Forecast Results Policy
DROP POLICY IF EXISTS "Managers and admins can view forecast results" ON public.forecast_results;
CREATE POLICY "Managers and admins can view forecast results"
    ON public.forecast_results FOR SELECT
    TO authenticated
    USING (public.is_manager_or_admin());

DROP POLICY IF EXISTS "Managers and admins can manage forecast results" ON public.forecast_results;
CREATE POLICY "Managers and admins can manage forecast results"
    ON public.forecast_results FOR ALL
    TO authenticated
    USING (public.is_manager_or_admin())
    WITH CHECK (public.is_manager_or_admin());
