import React from 'react';
import { ShoppingCart, ArrowUpRight, TrendingUp, Layers } from 'lucide-react';

export function ProductRankingTable({ rankedProducts = [], onPlanPurchase, horizonDays = 7 }) {
  if (!rankedProducts || rankedProducts.length === 0) return null;

  const totalDemand = rankedProducts.reduce((sum, p) => sum + (p.forecast_units_7d || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Product Demand Velocity & Velocity Ranking
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
              {rankedProducts.length} SKUs Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ranked by projected demand volume over the {horizonDays}-day horizon with 80% empirical bounds.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-3">Rank</th>
              <th className="py-2.5 px-3">SKU & Product Name</th>
              <th className="py-2.5 px-3">Store Type</th>
              <th className="py-2.5 px-3 text-right">Projected Demand</th>
              <th className="py-2.5 px-3 text-right">80% Interval</th>
              <th className="py-2.5 px-3 text-right">Demand Share</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {rankedProducts.map((prod, idx) => {
              const displayUnits = horizonDays === 1
                ? Math.round((prod.forecast_units_7d / 7) * 10) / 10
                : prod.forecast_units_7d;

              const displayLower = horizonDays === 1
                ? Math.round((prod.lower_bound_7d / 7) * 10) / 10
                : prod.lower_bound_7d;

              const displayUpper = horizonDays === 1
                ? Math.round((prod.upper_bound_7d / 7) * 10) / 10
                : prod.upper_bound_7d;

              const share = totalDemand > 0
                ? Math.round((prod.forecast_units_7d / totalDemand) * 100)
                : 0;

              return (
                <tr
                  key={prod.product_id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300'
                        : 'text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {prod.product_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {prod.product_id}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      prod.business_type === 'Cafe'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {prod.business_type || 'Retail'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="font-bold text-purple-600 dark:text-purple-400 font-mono text-sm">
                      {displayUnits} u
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    [{displayLower} - {displayUpper}]
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-600 dark:text-slate-300 w-8 text-right">
                        {share}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onPlanPurchase(prod)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition"
                      title="Calculate replenishment scenario order"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Smart PO</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
