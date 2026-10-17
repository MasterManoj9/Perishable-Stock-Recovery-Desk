import React from 'react';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.jsx';

export function InventoryTable({
  batches = [],
  selectedBatchId = null,
  onSelectBatch
}) {
  return (
    <div className="w-full overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th scope="col" className="py-3.5 px-5">Batch ID</th>
              <th scope="col" className="py-3.5 px-5">Product</th>
              <th scope="col" className="py-3.5 px-5 text-center">Quantity</th>
              <th scope="col" className="py-3.5 px-5">Expiry Date</th>
              <th scope="col" className="py-3.5 px-5">Status</th>
              <th scope="col" className="py-3.5 px-5 text-right">Original Price</th>
              <th scope="col" className="py-3.5 px-5 text-right">Cost (Inc.)</th>
              <th scope="col" className="py-3.5 px-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map((batch) => {
              const isSelected = selectedBatchId === batch.id;
              const isExpired = batch.expired === true;
              const isColdChain = batch.coldChainStatus === 'exception';
              const isExpiringSoon = batch.expiringSoon === true;

              let statusType = batch.eligibility?.status;
              let statusLabel = null;

              if (isExpired) {
                statusType = 'EXPIRED';
                statusLabel = 'Expired';
              } else if (isColdChain) {
                statusType = 'COLD_CHAIN_REVIEW';
                statusLabel = 'Cold-chain Issue';
              } else if (isExpiringSoon) {
                statusType = 'EXPIRING_SOON';
                statusLabel = 'Expiring Soon';
              } else if (batch.eligibility?.eligible) {
                statusType = 'ELIGIBLE';
                statusLabel = 'Eligible';
              }

              return (
                <tr
                  key={batch.id}
                  onClick={() => onSelectBatch(batch.id)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  {/* Batch ID */}
                  <td className="py-3.5 px-5 font-mono text-xs font-medium text-slate-600">
                    {batch.id}
                  </td>

                  {/* Product with Icon/Thumbnail */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg shrink-0 border border-slate-200">
                        {batch.image || '📦'}
                      </div>
                      <span className="font-semibold text-slate-900 text-sm truncate max-w-[220px]">
                        {batch.productName}
                      </span>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-5 text-center font-bold text-slate-800">
                    {batch.qty}
                  </td>

                  {/* Expiry Date */}
                  <td className="py-3.5 px-5 text-slate-600 text-xs">
                    {batch.expiryDisplay || (batch.expiryAt ? new Date(batch.expiryAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '18 Oct 2026')}
                  </td>

                  {/* Status Pill */}
                  <td className="py-3.5 px-5">
                    <StatusBadge status={statusType} label={statusLabel} />
                  </td>

                  {/* Original Price */}
                  <td className="py-3.5 px-5 text-right font-medium text-slate-800">
                    ₹{batch.originalPrice}
                  </td>

                  {/* Incremental Cost */}
                  <td className="py-3.5 px-5 text-right text-slate-600">
                    ₹{batch.incrementalCost}
                  </td>

                  {/* Actions (View + chevron) */}
                  <td className="py-3.5 px-5 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBatch(batch.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
