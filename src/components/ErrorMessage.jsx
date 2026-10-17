import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorMessage({
  title = 'An error occurred',
  message = 'Failed to load or process data.',
  onRetry = null
}) {
  return (
    <div className="p-4 sm:p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-900" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-rose-700 mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
