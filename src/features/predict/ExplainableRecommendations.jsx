import React from 'react';
import { Lightbulb, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle, Layers } from 'lucide-react';

export function ExplainableRecommendations({ recommendations = [] }) {
  if (!recommendations || recommendations.length === 0) return null;

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'high':
        return 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300';
      case 'medium':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300';
      case 'caution':
        return 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300';
      default:
        return 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
    }
  };

  const getIcon = (category) => {
    switch (category) {
      case 'Procurement & Prep':
        return TrendingUp;
      case 'Waste Prevention':
        return ShieldAlert;
      case 'Demand Priority':
        return Lightbulb;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4">
        <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
          <Lightbulb className="w-4 h-4" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Explainable Decision Recommendations
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated intelligence derived strictly from empirical sales variance and model evaluations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, i) => {
          const Icon = getIcon(rec.category);
          const style = getSeverityStyle(rec.severity);

          return (
            <div
              key={i}
              className={`p-4 rounded-xl border flex flex-col justify-between ${style}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-white/80 dark:bg-slate-900/80 uppercase tracking-wide border border-current">
                    {rec.category}
                  </span>
                  <Icon className="w-4 h-4 shrink-0" />
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {rec.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {rec.explanation}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Empirical Basis: </span>
                {rec.evidence}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
