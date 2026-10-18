import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

import { PredictHeader } from './PredictHeader.jsx';
import { PredictKPICards } from './PredictKPICards.jsx';
import { DemandForecastChart } from './DemandForecastChart.jsx';
import { WeekdayHeatmap } from './WeekdayHeatmap.jsx';
import { ProductRankingTable } from './ProductRankingTable.jsx';
import { ModelComparisonTable } from './ModelComparisonTable.jsx';
import { ExplainableRecommendations } from './ExplainableRecommendations.jsx';
import { SmartPurchasePlannerModal } from './SmartPurchasePlannerModal.jsx';
import { DatasetUploadModal } from './DatasetUploadModal.jsx';

import {
  getLatestPredictData,
  triggerModelRetrain,
  buildTimeSeriesChartData
} from '../../data/predictAdapter.js';

export function PredictPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [horizonDays, setHorizonDays] = useState(7);

  // Retraining state
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainProgress, setRetrainProgress] = useState('');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [plannerProduct, setPlannerProduct] = useState(null);

  // Initial load
  useEffect(() => {
    let active = true;
    getLatestPredictData()
      .then((res) => {
        if (active && res) {
          setData(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load predict state:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  // Filtered forecast sum for KPI card
  const filteredForecastSum = useMemo(() => {
    if (!data || !data.forecast_rows) return null;
    return data.forecast_rows
      .filter((r) => {
        if (selectedLocation !== 'all' && r.location_id !== selectedLocation) return false;
        if (selectedProduct !== 'all' && r.product_id !== selectedProduct) return false;
        return true;
      })
      .reduce((sum, r) => sum + r.predicted_units, 0);
  }, [data, selectedLocation, selectedProduct]);

  // Chart data
  const chartData = useMemo(() => {
    return buildTimeSeriesChartData(data, selectedLocation, selectedProduct);
  }, [data, selectedLocation, selectedProduct]);

  // Filtered product rankings
  const rankedProducts = useMemo(() => {
    if (!data || !data.insights?.ranked_products) return [];
    if (selectedProduct === 'all') {
      return data.insights.ranked_products;
    }
    return data.insights.ranked_products.filter((p) => p.product_id === selectedProduct);
  }, [data, selectedProduct]);

  // Retrain Trigger
  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainProgress('Initiating multi-model chronological cross-validation...');

    try {
      const updated = await triggerModelRetrain(14, (msg) => setRetrainProgress(msg));
      setData(updated);
      toast.success('Model training completed! Selected Global Gradient Boosting Regressor.');
    } catch (err) {
      toast.error(err?.message || 'Training run failed.');
    } finally {
      setIsRetraining(false);
      setRetrainProgress('');
    }
  };

  // Upload and confirm handler
  const handleUploadConfirm = async (file) => {
    toast.success(`Dataset "${file.name}" ingested. Initiating model training...`);
    handleRetrain();
  };

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-3">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Loading AI Demand Intelligence & Forecasting Engine...
        </p>
      </div>
    );
  }

  const topProduct = data?.insights?.ranked_products?.[0] || null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 pb-16 transition-colors">
      {/* Header */}
      <PredictHeader
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedProduct={selectedProduct}
        onProductChange={setSelectedProduct}
        horizonDays={horizonDays}
        onHorizonChange={setHorizonDays}
        activeModelName={data?.selected_model}
        lastTrainedAt={data?.trained_at}
        isRetraining={isRetraining}
        onRetrain={handleRetrain}
        onOpenUpload={() => setIsUploadOpen(true)}
        qualityScore={data?.summary_kpis?.quality_score}
      />

      {/* Retraining Banner if active */}
      {isRetraining && (
        <div className="bg-purple-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{retrainProgress || 'Fitting models on chronological partitions...'}</span>
          </div>
          <span className="font-mono text-[11px] opacity-80">14-Day Holdout Backtest</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 1. Summary KPI Cards */}
        <PredictKPICards
          kpis={data?.summary_kpis}
          horizonDays={horizonDays}
          filteredForecastSum={filteredForecastSum}
          topProduct={topProduct}
        />

        {/* 2. Interactive Time Series Chart */}
        <DemandForecastChart
          data={chartData}
          selectedLocation={selectedLocation}
          selectedProduct={selectedProduct}
          activeModelName={data?.selected_model}
        />

        {/* 3. Weekday Intensity Heatmap */}
        <WeekdayHeatmap
          heatmapData={data?.insights?.weekday_heatmap}
          peakDay={data?.insights?.peak_day}
          lowDay={data?.insights?.low_day}
        />

        {/* 4. Product Velocity Rankings & Smart Purchase Actions */}
        <ProductRankingTable
          rankedProducts={rankedProducts}
          onPlanPurchase={(prod) => setPlannerProduct(prod)}
          horizonDays={horizonDays}
        />

        {/* 5. Model Comparison Matrix */}
        <ModelComparisonTable
          comparison={data?.model_comparison}
          selectionReason={data?.selection_reason}
        />

        {/* 6. Explainable Recommendations */}
        <ExplainableRecommendations
          recommendations={data?.insights?.recommendations}
        />
      </div>

      {/* Modals */}
      {plannerProduct && (
        <SmartPurchasePlannerModal
          product={plannerProduct}
          onClose={() => setPlannerProduct(null)}
        />
      )}

      {isUploadOpen && (
        <DatasetUploadModal
          onClose={() => setIsUploadOpen(false)}
          onConfirmAndTrain={handleUploadConfirm}
        />
      )}
    </div>
  );
}
