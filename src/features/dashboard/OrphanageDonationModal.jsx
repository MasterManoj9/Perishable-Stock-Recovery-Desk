import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  HeartHandshake,
  MapPin,
  Package,
  Calendar,
  Tag,
  Coins,
  CheckCircle2,
  Building2,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { getOrphanageMetrics, recordOrphanageBatchDonation } from '../../data/orderStore.js';

const AVAILABLE_LOCATIONS = [
  { id: 'central', label: 'All Locations (Central Recovery Depot)' },
  { id: 'north', label: 'North Zone (Within 5 km radius)' },
  { id: 'south', label: 'South Sector (Within 10 km radius)' },
  { id: 'east', label: 'Eastern Suburbs (Within 12 km radius)' },
  { id: 'west', label: 'Western District (Within 15 km radius)' }
];

export function OrphanageDonationModal({
  isOpen,
  onClose,
  batch,
  onConfirmDonation
}) {
  if (!isOpen || !batch) return null;

  const [selectedLocation, setSelectedLocation] = useState('central');
  const [donateQuantity, setDonateQuantity] = useState(batch.qty || 1);
  const [requestedOnboarding, setRequestedOnboarding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const [metrics, setMetrics] = useState(() => getOrphanageMetrics());

  useEffect(() => {
    setMetrics(getOrphanageMetrics());
    setDonateQuantity(batch.qty || 1);
    setRequestedOnboarding(false);
    setSuccessMessage(null);
  }, [batch]);

  const handleDonate = async () => {
    if (donateQuantity <= 0 || donateQuantity > batch.qty) return;

    setIsSubmitting(true);
    try {
      const locObj = AVAILABLE_LOCATIONS.find(l => l.id === selectedLocation) || AVAILABLE_LOCATIONS[0];
      
      // 1. Record the batch donation
      recordOrphanageBatchDonation({
        batchId: batch.id,
        productName: batch.productName,
        quantity: donateQuantity,
        originalPrice: batch.originalPrice || 0,
        location: locObj.label,
        orphanageName: 'Central Orphanage Food Recovery Hub'
      });

      // 2. Call handler to update inventory batch (deducting stock)
      if (onConfirmDonation) {
        await onConfirmDonation(batch, donateQuantity, locObj.label);
      }

      setSuccessMessage(`Successfully routed ${donateQuantity} units of "${batch.productName}" to the orphanage network!`);
      setMetrics(getOrphanageMetrics());

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to donate batch:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedBatchValue = Math.round((donateQuantity * (batch.originalPrice || 0)) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-rose-100 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200/80 shrink-0">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Donate to Orphanages</span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Zero Waste Rescue
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Reroute near-expiry or slow-moving stock directly to verified children's homes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Being Donated */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
              {batch.imageUrl ? (
                <img src={batch.imageUrl} alt={batch.productName} className="w-full h-full object-cover" />
              ) : (
                batch.image || '📦'
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{batch.productName}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Batch: {batch.id} • {batch.category}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm font-extrabold text-slate-900">{batch.qty} units available</div>
            <div className="text-xs text-slate-500">₹{batch.originalPrice} MRP / unit</div>
          </div>
        </div>

        {/* ₹1 Micro-Donation Network Pool Status (Transparent Tracking) */}
        <div className="p-5 bg-gradient-to-br from-rose-50/60 via-amber-50/40 to-emerald-50/50 rounded-2xl border border-rose-200/70 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Customer ₹1 Micro-Donation & Orphanage Aid Pool
            </h4>
          </div>
          
          <p className="text-xs text-slate-600 leading-relaxed">
            Every customer checkout features an optional <strong className="text-rose-700 font-semibold">₹1 donation</strong> dedicated to funding fresh meals for local orphanages. Manager inventory donations combine with these collected funds to maximize nutritional relief.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Metric 1: How many ₹1 collected till now */}
            <div className="p-3 bg-white/90 backdrop-blur-xs rounded-xl border border-rose-200/60 flex items-center gap-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/70">
                <Coins className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">₹1 Donations Collected</span>
                <span className="text-base font-extrabold text-slate-900">
                  ₹{metrics.rupeeOneTotal}
                </span>
                <span className="text-[10px] text-emerald-600 font-medium ml-1.5">
                  ({metrics.rupeeOneCount} donor contributions)
                </span>
              </div>
            </div>

            {/* Metric 2: How much we have donated */}
            <div className="p-3 bg-white/90 backdrop-blur-xs rounded-xl border border-rose-200/60 flex items-center gap-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/70">
                <HeartHandshake className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Donated Till Now</span>
                <span className="text-base font-extrabold text-rose-700">
                  ₹{metrics.totalDonatedValue.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {metrics.totalUnitsDonated} food units + aid routed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Selection & Orphanage Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Select Orphanage through Location</span>
            </span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 shadow-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              {AVAILABLE_LOCATIONS.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.label}</option>
              ))}
            </select>
          </label>

          {/* Orphanages in Selected Location (Currently Empty as requested) */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-700">No registered partner orphanages listed in this sector yet</h5>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-0.5">
                Local NGO partner onboarding for this location is actively in progress. Donated items will be securely dispatched via our centralized refrigerated distribution channel.
              </p>
            </div>

            <div className="pt-1">
              {requestedOnboarding ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Request registered! Verification coordinator notified.</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setRequestedOnboarding(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>+ Request Orphanage Onboarding in This Location</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quantity to Donate */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="text-xs font-bold text-slate-800 block">Units to Donate</label>
            <span className="text-[11px] text-slate-500">Estimated Food Value: ₹{estimatedBatchValue}</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={batch.qty}
              value={donateQuantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setDonateQuantity(Math.min(batch.qty, Math.max(1, val)));
                }
              }}
              className="w-20 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg py-1.5 px-2 focus:ring-2 focus:ring-rose-500/20"
            />
            <button
              type="button"
              onClick={() => setDonateQuantity(batch.qty)}
              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:text-black bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              All ({batch.qty})
            </button>
          </div>
        </div>

        {/* Success message banner */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={isSubmitting || donateQuantity <= 0}
            onClick={handleDonate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>{isSubmitting ? 'Routing Donation...' : `Confirm Donation of ${donateQuantity} Units`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
