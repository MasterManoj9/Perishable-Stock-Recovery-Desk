import React from 'react';
import { Award, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';

export function ModelComparisonTable({ comparison = [], selectionReason = '' }) {
  if (!comparison || comparison.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Model Comparison & Holdout Benchmark Matrix
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              Strict 14-Day Chronological Test
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real evaluated error metrics on the exact same holdout period (2026-10-04 to 2026-10-17).
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3">Model Architecture</th>
              <th className="py-2.5 px-3">Family</th>
              <th className="py-2.5 px-3 text-right">MAE (Units)</th>
              <th className="py-2.5 px-3 text-right">WAPE (%)</th>
              <th className="py-2.5 px-3 text-right">RMSE</th>
              <th className="py-2.5 px-3 text-right">Baseline Lift</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {comparison.map((m) => {
              const isWinner = m.is_selected;

              return (
                <tr
                  key={m.model_name}
                  className={`transition-colors ${
                    isWinner
                      ? 'bg-purple-50/60 dark:bg-purple-950/20 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {isWinner ? (
                        <Award className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      ) : (
                        <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <span className="text-slate-900 dark:text-white">
                          {m.model_name}
                        </span>
                        <p className="text-[10px] text-slate-400 font-normal">
                          {m.notes}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {m.family}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {m.mae}
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    {m.wape_pct}%
                  </td>

                  <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                    {m.rmse}
                  </td>

                  <td className="py-3 px-3 text-right font-mono">
                    {m.baseline_lift_pct > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        +{m.baseline_lift_pct}%
                      </span>
                    ) : m.baseline_lift_pct < 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        {m.baseline_lift_pct}%
                      </span>
                    ) : (
                      <span className="text-slate-400">Baseline</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {isWinner ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-xs">
                        <CheckCircle className="w-3 h-3" />
                        Selected
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        Evaluated
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selection Policy Note */}
      {selectionReason && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-200">Selection Policy Outcome: </span>
          {selectionReason}
        </div>
      )}
    </div>
  );
}
