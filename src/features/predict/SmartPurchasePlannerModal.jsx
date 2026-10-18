import React, { useState } from 'react';
import { X, ShoppingCart, Calculator, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { calculateSmartPurchasePlan } from '../../data/predictAdapter.js';

export function SmartPurchasePlannerModal({ product, onClose }) {
  if (!product) return null;

  const [leadTimeDays, setLeadTimeDays] = useState(1);
  const [safetyStockDays, setSafetyStockDays] = useState(2);
  const [onHandUnits, setOnHandUnits] = useState(15);
  const [incomingOrders, setIncomingOrders] = useState(0);

  const plan = calculateSmartPurchasePlan({
    forecastUnits7d: product.forecast_units_7d || 50,
    onHandUnits: Number(onHandUnits) || 0,
    leadTimeDays: Number(leadTimeDays) || 1,
    safetyStockDays: Number(safetyStockDays) || 2,
    incomingOrders: Number(incomingOrders) || 0
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Smart Purchase Replenishment Planner
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scenario replenishment calculation for {product.product_name} ({product.product_id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Demand Baseline Card */}
          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase">
                Forecasted 7-Day Demand
              </span>
              <div className="text-2xl font-black text-purple-950 dark:text-purple-100 font-mono">
                {product.forecast_units_7d} units
              </div>
              <div className="text-xs text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                Velocity rate: ~{plan.dailyDemandRate} units/day
              </div>
            </div>
            <div className="text-right text-xs text-purple-600 dark:text-purple-400">
              <span>80% Interval:</span>
              <div className="font-mono font-bold">
                [{product.lower_bound_7d} - {product.upper_bound_7d}]
              </div>
            </div>
          </div>

          {/* Interactive Parameters Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Usable On-Hand Inventory (Units)
              </label>
              <input
                type="number"
                min="0"
                value={onHandUnits}
                onChange={(e) => setOnHandUnits(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[11px] text-slate-400">Excludes expired batches</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirmed Incoming POs (Units)
              </label>
              <input
                type="number"
                min="0"
                value={incomingOrders}
                onChange={(e) => setIncomingOrders(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[11px] text-slate-400">Units in transit</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Lead Time (Days)
              </label>
              <input
                type="number"
                min="0"
                max="14"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[11px] text-slate-400">Order-to-delivery interval</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Safety Stock Buffer (Days)
              </label>
              <input
                type="number"
                min="0"
                max="14"
                value={safetyStockDays}
                onChange={(e) => setSafetyStockDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[11px] text-slate-400">Protection against demand spikes</span>
            </div>
          </div>

          {/* Suggested Order Result */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Suggested Replenishment Order
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-0.5">
                {plan.netOrderSuggestion} units
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Gross Need: {plan.grossRequirement} u (Lead: {plan.leadTimeDemand}u + Safety: {plan.safetyStockUnits}u)
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>

          {/* Phase 9 & 10 Safety Disclosures */}
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Assumptions & Non-Autonomous Order Notice:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
              {plan.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
              <li>This is a decision-support calculation; purchase orders must be verified by store manager before placement.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
          >
            Close Planner
          </button>
        </div>
      </div>
    </div>
  );
}
