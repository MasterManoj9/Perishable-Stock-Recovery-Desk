import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading inventory data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center" role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}
