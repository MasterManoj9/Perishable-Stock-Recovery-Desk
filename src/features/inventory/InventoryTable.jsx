import React from 'react';
import { ChevronRight, Trash2, Edit2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { classifyExpiry } from '../../domain/eligibility.js';

export function InventoryTable({
  batches = [],
  selectedBatchId = null,
  onSelectBatch,
  onEditBatch = null,
  onDeleteBatch = null
}) {
  return (
    <div className="w-full overflow-hidden border border-[#EEDDD2] rounded-2xl bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[#FFF8F3] border-b border-[#EEDDD2] text-xs font-semibold text-[#76675F]">
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
          <tbody className="divide-y divide-[#EEDDD2]/60">
            {batches.map((batch) => {
              const isSelected = selectedBatchId === batch.id;
              const expiry = classifyExpiry(batch);
              const isColdChain = batch.coldChainStatus === 'exception' || batch.cold_chain_status === 'exception';
              const isDamaged = batch.condition === 'damaged';

              return (
                <tr
                  key={batch.id}
                  onClick={() => onSelectBatch(batch.id)}
                  className={`hover:bg-[#FFF8F3]/80 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#D97757]/10' : ''
                  }`}
                >
                  {/* Batch ID */}
                  <td className="py-3.5 px-5 font-mono text-xs font-medium text-[#76675F]">
                    {batch.id}
                  </td>

                  {/* Product with Icon/Thumbnail */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#FFF8F3] flex items-center justify-center text-lg shrink-0 border border-[#EEDDD2] overflow-hidden">
                        {batch.imageUrl ? (
                          <img src={batch.imageUrl} alt={batch.productName} className="w-full h-full object-cover" />
                        ) : (
                          batch.image || '📦'
                        )}
                      </div>
                      <span className="font-semibold text-[#302722] text-sm truncate max-w-[220px]">
                        {batch.productName}
                      </span>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-5 text-center font-bold text-[#302722]">
                    {batch.qty}
                  </td>

                  {/* Expiry Date */}
                  <td className="py-3.5 px-5 text-[#76675F] text-xs">
                    {batch.expiryDisplay || (batch.expiryAt ? new Date(batch.expiryAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '18 Oct 2026')}
                  </td>

                  {/* Status Pill */}
                  <td className="py-3.5 px-5">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={expiry.status} label={expiry.label} />
                      {isColdChain && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md"
                          title="Sale blocked: unresolved cold-chain exception. A valid expiry date does not establish product safety."
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Cold-Chain Blocked</span>
                        </span>
                      )}
                      {!isColdChain && isDamaged && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md"
                          title="Stock is damaged. Strictly blocked from sale."
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Damaged</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Original Price */}
                  <td className="py-3.5 px-5 text-right font-medium text-[#302722]">
                    ₹{batch.originalPrice}
                  </td>

                  {/* Incremental Cost */}
                  <td className="py-3.5 px-5 text-right text-[#76675F]">
                    ₹{batch.incrementalCost}
                  </td>

                  {/* Actions (View + Edit + Delete) */}
                  <td className="py-3.5 px-5 text-center">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <button
                        type="button"
                        id={`view-btn-${batch.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBatch(batch.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#302722] bg-[#FFF8F3] hover:bg-[#FFE8DC] border border-[#EEDDD2] rounded-md transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#76675F]" />
                      </button>

                      {onEditBatch && (
                        <button
                          type="button"
                          id={`edit-btn-${batch.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBatch(batch);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#302722] bg-[#FFF8F3] hover:bg-[#FFE8DC] border border-[#EEDDD2] rounded-md transition-colors cursor-pointer"
                          title={`Edit ${batch.productName}`}
                          aria-label={`Edit ${batch.productName}`}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#76675F]" />
                          <span>Edit</span>
                        </button>
                      )}

                      {onDeleteBatch && (
                        <button
                          type="button"
                          id={`delete-btn-${batch.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBatch(batch);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/80 rounded-md transition-colors cursor-pointer"
                          title={`Delete ${batch.productName}`}
                          aria-label={`Delete ${batch.productName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      )}
                    </div>
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
