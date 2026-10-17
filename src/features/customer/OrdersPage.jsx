/**
 * OrdersPage.jsx — Customer Order History
 * 
 * Displays the customer's completed and pending orders with details.
 */

import React, { useState, useMemo } from 'react';
import { ClipboardList, Package, Check, Clock, XCircle, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { getOrders } from '../../data/orderStore.js';
import { useAuth } from '../../lib/auth.js';

export function OrdersPage() {
  const { user } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState(null);

  const orders = useMemo(() => {
    return getOrders(user?.id);
  }, [user?.id]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return { icon: Check, text: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' };
      case 'pending':
        return { icon: Clock, text: 'Pending', cls: 'bg-amber-100 text-amber-700' };
      case 'cancelled':
        return { icon: XCircle, text: 'Cancelled', cls: 'bg-red-100 text-red-700' };
      default:
        return { icon: Package, text: status, cls: 'bg-slate-100 text-slate-700' };
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
          <ClipboardList className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">No orders yet</h2>
        <p className="text-slate-500 text-sm">Your order history will appear here after your first purchase</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 mb-6">My Orders</h2>

      <div className="space-y-4">
        {orders.map(order => {
          const status = getStatusBadge(order.status);
          const StatusIcon = status.icon;
          const isExpanded = expandedOrder === order.id;

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Order Header */}
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-mono text-xs text-slate-500">{order.id}</p>
                    <p className="font-semibold text-sm text-slate-800">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''} · ₹{order.total}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${status.cls}`}>
                    <StatusIcon className="w-3 h-3" /> {status.text}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <span className="text-2xl">{item.image}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{item.productName}</p>
                        <p className="text-xs text-slate-500">
                          ₹{item.priceSnapshot} × {item.quantity}
                          {item.discountPercentage > 0 && (
                            <span className="text-emerald-600 ml-1">({item.discountPercentage}% off)</span>
                          )}
                        </p>
                      </div>
                      <p className="font-semibold text-sm">₹{item.lineTotal}</p>
                    </div>
                  ))}

                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>₹{order.subtotal}</span>
                    </div>
                    {order.donationAmount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> Donation</span>
                        <span>₹{order.donationAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-emerald-600">₹{order.total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
