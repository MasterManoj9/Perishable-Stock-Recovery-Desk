/**
 * ProtectedRoute.jsx — Role-Based Route Guard Component
 * 
 * Verifies that the user is authenticated and possesses the required role
 * before rendering protected child views.
 */

import React from 'react';
import { useAuth } from '../lib/auth.js';
import { LoadingState } from './LoadingState.jsx';
import { ShieldAlert } from 'lucide-react';

export function ProtectedRoute({ 
  children, 
  requiredRole = null, // 'manager', 'customer', or null (any authenticated)
  fallback = null 
}) {
  const { user, profile, loading, isAuthenticated, isManager } = useAuth();

  if (loading) {
    return <LoadingState message="Verifying session authorization..." />;
  }

  if (!isAuthenticated) {
    if (fallback) return fallback;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Authentication Required</h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          Please sign in to your account to access this area of the Perishable Stock Recovery Desk.
        </p>
      </div>
    );
  }

  if (requiredRole === 'manager' && !isManager) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Manager Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Your current account does not have store manager privileges.
        </p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
