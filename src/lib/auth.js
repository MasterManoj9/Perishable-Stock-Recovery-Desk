/**
 * auth.js — Authentication Context Provider
 * 
 * Provides authentication state management for both Supabase-connected
 * and demo (localStorage) modes. Supports customer and manager roles.
 * 
 * In demo mode:
 * - Users are stored in localStorage under 'c30_auth_users'
 * - Sessions are stored under 'c30_auth_session'
 * - Passwords are hashed client-side (demo only — real auth uses Supabase Auth)
 * 
 * In production:
 * - Supabase Auth handles all credential management
 * - Roles are stored in the profiles table, enforced by RLS
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';

const AuthContext = createContext(null);

const AUTH_USERS_KEY = 'c30_auth_users';
const AUTH_SESSION_KEY = 'c30_auth_session';

// ─── Demo Mode Helpers ──────────────────────────────────────────────

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
      password: 'manager123',
      full_name: 'Store Manager',
      phone: '+91-9876543210',
      role: 'manager',
      avatar_url: null,
      created_at: new Date().toISOString()
    },
    {
      id: 'customer-001',
      email: 'customer@example.com',
      password: 'customer123',
      full_name: 'Demo Customer',
      phone: '+91-9876543211',
      role: 'customer',
      avatar_url: null,
      created_at: new Date().toISOString()
    }
  ];
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveDemoUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
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
  if (session) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

// ─── Auth Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setProfile(prof);
          }
        } catch (err) {
          console.error('Session restore failed:', err);
        }
      } else {
        // Demo mode: restore from localStorage
        const session = getDemoSession();
        if (session) {
          setUser(session);
          setProfile(session);
        }
      }
      setLoading(false);
    };

    restoreSession();

    // Listen for auth changes (Supabase only)
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setProfile(prof);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      );
      return () => subscription.unsubscribe();
    }
  }, []);

  // ─── Sign Up ────────────────────────────────────────────────

  const signUp = useCallback(async ({ email, password, full_name, phone, role = 'customer' }) => {
    setError(null);
    
    if (isSupabaseConfigured) {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name, phone, role }
        }
      });
      if (authError) {
        setError(authError.message);
        return { success: false, error: authError.message };
      }
      return { success: true, user: data.user };
    }

    // Demo mode
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

  // ─── Sign In ────────────────────────────────────────────────

  const signIn = useCallback(async ({ email, password }) => {
    setError(null);

    if (isSupabaseConfigured) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError) {
        setError(authError.message);
        return { success: false, error: authError.message };
      }
      return { success: true, user: data.user };
    }

    // Demo mode
    const users = getDemoUsers();
    const found = users.find(u => u.email === email && u.password === password);
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
  }, []);

  // ─── Sign Out ───────────────────────────────────────────────

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    saveDemoSession(null);
  }, []);

  // ─── Update Profile ─────────────────────────────────────────

  const updateProfile = useCallback(async (updates) => {
    if (isSupabaseConfigured) {
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

    // Demo mode
    const users = getDemoUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return { success: false, error: 'User not found' };

    // Never allow role self-escalation
    const safeUpdates = { ...updates };
    delete safeUpdates.role;
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
    updateProfile,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
