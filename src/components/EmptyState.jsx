import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'No inventory records matched your current query or filters.',
  action = null
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-[#EEDDD2] shadow-xs">
      <div className="p-3.5 bg-[#FFF8F3] border border-[#EEDDD2] rounded-2xl text-[#D97757] mb-4" aria-hidden="true">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-[#302722] mb-1">{title}</h3>
      <p className="text-xs text-[#76675F] max-w-sm mb-6">{description}</p>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}

