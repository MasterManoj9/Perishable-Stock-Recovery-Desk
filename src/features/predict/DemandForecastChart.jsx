import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[200px]">
      <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2">
        Date: {label}
      </p>
      {payload.map((entry, index) => {
        if (entry.value === null || entry.value === undefined) return null;
        return (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 py-0.5">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-white">
              {entry.value} units
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DemandForecastChart({ data, selectedLocation, selectedProduct, activeModelName }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500">
        No time-series data available for the selected filters.
      </div>
    );
  }

  // Find index where future starts
  const futureStartItem = data.find(d => d.is_future);
  const dividerDate = futureStartItem ? futureStartItem.displayDate : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Demand Trajectory & Out-of-Sample Forecast
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Empirical Holdout & Future 7D
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily units sold with 14-day holdout validation fit and forward prediction intervals (80% confidence bound).
          </p>
        </div>

        {/* Legend Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Observed Sales
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Holdout Fit
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Forward Forecast
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
            <XAxis
              dataKey="displayDate"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.4 }}
              unit=" u"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Divider line separating History and Forecast */}
            {dividerDate && (
              <ReferenceLine
                x={dividerDate}
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Forecast Begins →',
                  position: 'top',
                  fill: '#a855f7',
                  fontSize: 10,
                  fontWeight: 'bold'
                }}
              />
            )}

            {/* 1. Historical Actual Sales */}
            <Line
              type="monotone"
              dataKey="actual_units"
              name="Observed Sales"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />

            {/* 2. Holdout Validation Predicted (dashed) */}
            <Line
              type="monotone"
              dataKey="validation_predicted"
              name="Validation Holdout Fit"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />

            {/* 3. Prediction Interval Upper Band */}
            <Area
              type="monotone"
              dataKey="upper_bound"
              name="Upper Bound (p90)"
              stroke="transparent"
              fill="url(#forecastBand)"
              connectNulls={false}
            />

            {/* 4. Future Forecast Line */}
            <Line
              type="monotone"
              dataKey="forecast_units"
              name="Forecast Units"
              stroke="#a855f7"
              strokeWidth={3}
              dot={{ r: 4, fill: '#a855f7', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footnote Disclosures */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Model: {activeModelName} · Multi-lag recursive autoregression</span>
        <span>Interval: 80% empirical prediction bounds (p10 to p90 quantiles)</span>
      </div>
    </div>
  );
}
