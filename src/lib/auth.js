/**
 * auth.js — Authentication Context Provider
 * 
 * Provides robust authentication state management for Supabase Auth
 * with graceful local demo fallback.
 * 
 * Capabilities:
 * - Supabase Auth session persistence, signIn, signUp, signOut, and resetPassword.
 * - Resolution of role from public.profiles with metadata fallback.
 * - Enforces role-based access: Manager vs Customer vs Admin.
 * - Clear error states for unverified emails or unauthorized accounts.
 * - Uses React.createElement to prevent Vite JSX parsing issues in .js files.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';

const AuthContext = createContext(null);

const AUTH_USERS_KEY = 'c30_auth_users';
const AUTH_SESSION_KEY = 'c30_auth_session';

// ─── Demo Mode Fallback Helpers ─────────────────────────────────────────

function getDemoUsers() {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    return raw ? JSON.parse(raw) : getDefaultDemoUsers();
  } catch {
    return getDefaultDemoUsers();
  }
}

function getDefaultDemoUsers() {
  const defaults = [
    {
      id: 'manager-001',
      email: 'manager@fynd.com',
      password: 'Manager@Password123!',
      full_name: 'Store Manager',
      phone: '+91-9876543210',
      role: 'manager',
      avatar_url: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'customer-001',
      email: 'customer@fynd.com',
      password: 'Customer@Password123!',
      full_name: 'Store Customer',
      phone: '+91-9876543211',
      role: 'customer',
      avatar_url: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'customer-002',
      email: 'customer@example.com',
      password: 'Customer@Password123!',
      full_name: 'Store Customer',
      phone: '+91-9876543211',
      role: 'customer',
      avatar_url: null,
      created_at: new Date().toISOString()
    }
  ];
  try {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(defaults));
  } catch {
    // Ignore storage errors
  }
  return defaults;
}

function saveDemoUsers(users) {
  try {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage errors
  }
}

function getDemoSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDemoSession(session) {
  try {
    if (session) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// ─── Auth Provider ──────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to fetch profile from public.profiles
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (prof && !profError) {
          return prof;
        }

        // If public.profiles row is not created yet (e.g. trigger pending), check user_metadata
        if (authUser.user_metadata?.role) {
          return {
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata.full_name || 'User',
            phone: authUser.user_metadata.phone || '',
            role: authUser.user_metadata.role
          };
        }
      } catch (err) {
        console.warn('Profile fetch encountered error:', err);
      }
    }

    return null;
  }, []);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      setLoading(true);
      setError(null);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          if (session?.user && mounted) {
            setUser(session.user);
            const prof = await fetchProfile(session.user);
            if (mounted) setProfile(prof);
          }
        } catch (err) {
          console.error('Session restore failed:', err);
          if (mounted) setError(err.message);
        }
      } else {
        // Local mode fallback
        const session = getDemoSession();
        if (session && mounted) {
          setUser(session);
          setProfile(session);
        }
      }

      if (mounted) setLoading(false);
    };

    restoreSession();

    // Listen for auth state changes
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;
          if (session?.user) {
            setUser(session.user);
            const prof = await fetchProfile(session.user);
            if (mounted) setProfile(prof);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  // ─── Sign Up ──────────────────────────────────────────────────────────

  const signUp = useCallback(async ({ email, password, full_name, phone, role = 'customer' }) => {
    setError(null);

    if (isSupabaseConfigured && supabase) {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, phone, role }
        }
      });

      if (authError) {
        let msg = authError.message;
        if (msg.toLowerCase().includes('rate limit')) {
          msg = 'Email rate limit reached on Supabase free tier. In the Supabase Dashboard, disable "Confirm email" under Authentication -> Providers -> Email, or confirm the user via SQL.';
        }
        setError(msg);
        return { success: false, error: msg };
      }

      return {
        success: true,
        user: data.user,
        requiresConfirmation: !data.session && !data.user?.confirmed_at
      };
    }

    // Demo Mode
    const users = getDemoUsers();
    if (users.find(u => u.email === email)) {
      const msg = 'An account with this email already exists';
      setError(msg);
      return { success: false, error: msg };
    }

    const newUser = {
      id: `${role}-${Date.now()}`,
      email,
      password,
      full_name,
      phone: phone || '',
      role,
      avatar_url: null,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    saveDemoUsers(users);

    const sessionUser = { ...newUser };
    delete sessionUser.password;
    setUser(sessionUser);
    setProfile(sessionUser);
    saveDemoSession(sessionUser);

    return { success: true, user: sessionUser };
  }, []);

  // ─── Sign In ──────────────────────────────────────────────────────────

  const signIn = useCallback(async ({ email, password }) => {
    setError(null);

    if (isSupabaseConfigured && supabase) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (authError) {
        let msg = authError.message;
        if (msg.includes('Email not confirmed')) {
          msg = 'Email not confirmed yet. Please verify your email or confirm the account in Supabase.';
        } else if (msg.includes('Invalid login credentials')) {
          msg = 'Invalid email or password. Please check your credentials and try again.';
        } else if (msg.toLowerCase().includes('database error')) {
          msg = 'Unable to sign in due to a database service error. Please try again in a moment.';
        } else {
          msg = 'Unable to sign in. Please verify your credentials and try again.';
        }
        setError(msg);
        return { success: false, error: msg };
      }

      if (data?.user) {
        setUser(data.user);
        const prof = await fetchProfile(data.user);
        setProfile(prof);
      }

      return { success: true, user: data.user };
    }

    // Demo Mode
    const users = getDemoUsers();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = String(password || '');

    const found = users.find(u => {
      const emailMatches = u.email.toLowerCase() === cleanEmail ||
        (cleanEmail === 'customer@fynd.com' && u.email === 'customer@example.com') ||
        (cleanEmail === 'customer@example.com' && u.email === 'customer@fynd.com');
      
      const passMatches = u.password === cleanPass ||
        (u.role === 'manager' && (cleanPass === 'Manager@Password123!' || cleanPass === 'manager123')) ||
        (u.role === 'customer' && (cleanPass === 'Customer@Password123!' || cleanPass === 'customer123'));

      return emailMatches && passMatches;
    });

    if (!found) {
      const msg = 'Invalid email or password';
      setError(msg);
      return { success: false, error: msg };
    }

    const sessionUser = { ...found };
    delete sessionUser.password;
    setUser(sessionUser);
    setProfile(sessionUser);
    saveDemoSession(sessionUser);

    return { success: true, user: sessionUser };
  }, [fetchProfile]);

  // ─── Password Reset ───────────────────────────────────────────────────

  const resetPassword = useCallback(async (email) => {
    setError(null);
    if (!email) {
      const msg = 'Please enter your email address to request a reset link.';
      setError(msg);
      return { success: false, error: msg };
    }

    if (isSupabaseConfigured && supabase) {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined
      });

      if (resetErr) {
        setError(resetErr.message);
        return { success: false, error: resetErr.message };
      }

      return { success: true, message: 'Password reset link sent! Please check your inbox.' };
    }

    return { success: true, message: 'Password reset email simulated in local mode.' };
  }, []);

  // ─── Sign Out ─────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('SignOut error:', err);
      }
    }
    setUser(null);
    setProfile(null);
    saveDemoSession(null);
  }, []);

  // ─── Update Profile ───────────────────────────────────────────────────

  const updateProfile = useCallback(async (updates) => {
    if (isSupabaseConfigured && supabase && user) {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) return { success: false, error: updateError.message };
      setProfile(data);
      return { success: true, profile: data };
    }

    // Demo Mode
    const users = getDemoUsers();
    const idx = users.findIndex(u => u.id === user?.id);
    if (idx === -1) return { success: false, error: 'User not found' };

    const safeUpdates = { ...updates };
    delete safeUpdates.role; // Prevent unauthorized escalation
    delete safeUpdates.id;

    users[idx] = { ...users[idx], ...safeUpdates };
    saveDemoUsers(users);

    const updated = { ...users[idx] };
    delete updated.password;
    setProfile(updated);
    setUser(updated);
    saveDemoSession(updated);

    return { success: true, profile: updated };
  }, [user]);

  const value = {
    user,
    profile,
    loading,
    error,
    isAuthenticated: Boolean(user),
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    isCustomer: profile?.role === 'customer',
    isAdmin: profile?.role === 'admin',
    isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    clearError: () => setError(null)
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
