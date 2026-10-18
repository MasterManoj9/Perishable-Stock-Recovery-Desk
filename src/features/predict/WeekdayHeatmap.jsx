import React from 'react';
import { Calendar, Flame, AlertCircle, Info } from 'lucide-react';

export function WeekdayHeatmap({ heatmapData = [], peakDay = 'Sun', lowDay = 'Fri' }) {
  if (!heatmapData || heatmapData.length === 0) return null;

  // Find max units to scale color intensity
  const maxUnits = Math.max(...heatmapData.map(d => d.avg_units_per_day), 1);
  const minUnits = Math.min(...heatmapData.map(d => d.avg_units_per_day), 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Weekday Demand Intensity Matrix
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              90-Day Empirical
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Average daily velocity and total volume observed per weekday across all operational locations.
          </p>
        </div>

        {/* Peak & Low badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
            <Flame className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Peak: {peakDay}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Low: {lowDay}
          </span>
        </div>
      </div>

      {/* Weekday Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {heatmapData.map((item) => {
          const isPeak = item.day_name === peakDay;
          const isLow = item.day_name === lowDay;
          const intensity = Math.min(1.0, Math.max(0.15, (item.avg_units_per_day - minUnits) / (maxUnits - minUnits || 1)));

          return (
            <div
              key={item.day_name}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                isPeak
                  ? 'border-purple-300 dark:border-purple-700 bg-purple-50/80 dark:bg-purple-950/40 shadow-xs'
                  : isLow
                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {item.day_name}
                  </span>
                  {isPeak && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-600 text-white uppercase">
                      Peak
                    </span>
                  )}
                  {isLow && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                      Low
                    </span>
                  )}
                </div>

                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {item.avg_units_per_day}
                  <span className="text-xs font-normal text-slate-500 ml-1">u/day</span>
                </div>
              </div>

              {/* Progress bar intensity indicator */}
              <div className="mt-3">
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isPeak ? 'bg-purple-600' : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                    style={{ width: `${Math.round(intensity * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                  <span>{item.total_units_sold.toLocaleString()} total</span>
                  <span>{item.observations} obs</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coverage Warning Disclosure */}
      <div className="mt-4 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>Resolution Disclosure:</strong> Analysis is rendered at daily interval resolution. Hourly transaction time-stamping was not recorded in this 90-day store release, preventing sub-daily hour-of-day peak claims.
        </span>
      </div>
    </div>
  );
}
