/**
 * BusinessInsightsPage.jsx — Store Manager Business Intelligence & Recovery Analytics
 * 
 * Powered by verified database orders, payments, donations, and inventory records.
 * Provides date-range filtering, sales overviews, interactive charts, product rankings,
 * repeat-purchase cohort analysis, and food waste recovery outcome metrics.
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  PackageCheck,
  Heart,
  Users,
  AlertOctagon,
  Award,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  Clock,
  Layers,
  ShoppingBag
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getOrderAnalytics } from '../../data/orderStore.js';

const RANGE_OPTIONS = [
  { id: 'weekly', label: 'Last 7 Days' },
  { id: 'monthly', label: 'Last 30 Days' },
  { id: 'last_3m', label: 'Last 3 Months' },
  { id: 'last_6m', label: 'Last 6 Months' },
  { id: 'last_1y', label: 'Last 1 Year' },
  { id: 'all', label: 'All Time' }
];

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export function BusinessInsightsPage({ batches = [] }) {
  const [selectedRange, setSelectedRange] = useState('all');
  const [productSortBy, setProductSortBy] = useState('revenue');

  // Compute analytics strictly from verified records
  const analytics = useMemo(() => {
    return getOrderAnalytics(selectedRange, batches);
  }, [selectedRange, batches]);

  // Chart data for revenue and units
  const chartData = useMemo(() => {
    if (!analytics.monthly || analytics.monthly.length === 0) {
      return [];
    }
    return analytics.monthly.map(m => ({
      name: m.month,
      Revenue: m.revenue,
      Units: m.units,
      Orders: m.orders
    }));
  }, [analytics.monthly]);

  // Waste & Recovery Distribution Data
  const recoveryPieData = useMemo(() => {
    const wi = analytics.wasteInsights || {};
    return [
      { name: 'Recovered & Sold', value: wi.unitsRecoveredSold || 0, color: '#10b981' },
      { name: 'Available Eligible', value: wi.eligibleUnsoldStock || 0, color: '#0ea5e9' },
      { name: 'Cold-Chain Quarantine', value: wi.quarantinedStock || 0, color: '#f59e0b' },
      { name: 'Expired / Blocked', value: (wi.expiredStock || 0) + (wi.damagedStock || 0), color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [analytics.wasteInsights]);

  // Sorted product list
  const sortedProducts = useMemo(() => {
    const prods = [...(analytics.products || [])];
    if (productSortBy === 'revenue') {
      return prods.sort((a, b) => b.revenue - a.revenue);
    }
    if (productSortBy === 'units') {
      return prods.sort((a, b) => b.unitsSold - a.unitsSold);
    }
    return prods.sort((a, b) => b.orderCount - a.orderCount);
  }, [analytics.products, productSortBy]);

  const hasData = analytics.totalOrders > 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Date Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Business Insights</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live BI Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time sales revenue, margin recovery, customer repeat rates, and food rescue outcomes.
          </p>
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-x-auto">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedRange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRange === opt.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Headline Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">₹{analytics.grossSales}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>Avg Order: ₹{analytics.avgOrderValue}</span>
            <span className="text-emerald-600 font-semibold">{analytics.totalOrders} Orders</span>
          </div>
        </div>

        {/* Units Sold & Recovered */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Units Recovered</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">{analytics.totalUnits} <span className="text-base font-semibold text-slate-400">units</span></p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>Markdown Savings: ₹{analytics.totalDiscountGiven}</span>
            <span className="text-blue-600 font-semibold">Saved from waste</span>
          </div>
        </div>

        {/* Verified Donations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">₹1 Micro-Donations</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 mt-3">₹{analytics.totalDonations}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>Near-Expiry Food Initiative</span>
            <span className="text-rose-600 font-semibold">100% Verified</span>
          </div>
        </div>

        {/* Repeat Purchase Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Repeat Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-3">{analytics.repeatRate}%</p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>{analytics.repeatCustomers} repeat of {analytics.uniqueCustomers} buyers</span>
            <span className="text-purple-600 font-semibold">Cohort retention</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue & Units Over Time Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Sales Revenue & Units Over Time</h3>
                <p className="text-xs text-slate-400">Monthly recovery sales trajectory</p>
              </div>
              {analytics.bestMonth && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Top Month: {analytics.bestMonth.month} (₹{analytics.bestMonth.revenue})
                </div>
              )}
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="Revenue (₹)"
                  />
                  <Bar dataKey="Units" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units Sold" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Waste vs Recovery Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Inventory Recovery Status</h3>
              <p className="text-xs text-slate-400">Total units sold vs unsold vs quarantined</p>
            </div>

            <div className="h-56 w-full my-auto flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={recoveryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {recoveryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              {recoveryPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value} units</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-800 text-base mb-1">No orders in this time period</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Orders placed via the Customer Shopping portal and completed checkout transactions will populate these charts in real time.
          </p>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
            Filter: {RANGE_OPTIONS.find(r => r.id === selectedRange)?.label}
          </span>
        </div>
      )}

      {/* Best-Performing Products & Deep Dive Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Top Performing Products</h3>
            <p className="text-xs text-slate-400">Ranking by total recovery revenue and volume</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'revenue', label: 'Revenue' },
                { id: 'units', label: 'Units Sold' },
                { id: 'orders', label: 'Orders' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setProductSortBy(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    productSortBy === s.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No product sales data recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-6">Rank</th>
                  <th className="py-3 px-6">Product</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6 text-right">Units Sold</th>
                  <th className="py-3 px-6 text-right">Orders</th>
                  <th className="py-3 px-6 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-400">#{idx + 1}</td>
                    <td className="py-3.5 px-6">
                      <span className="font-semibold text-slate-900 text-sm block">{p.productName}</span>
                      <span className="text-[10px] font-mono text-slate-400">{p.productId}</span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold text-slate-800">{p.unitsSold}</td>
                    <td className="py-3.5 px-6 text-right font-medium text-slate-600">{p.orderCount}</td>
                    <td className="py-3.5 px-6 text-right font-extrabold text-emerald-600 text-sm">₹{p.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default BusinessInsightsPage;
