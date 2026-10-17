/**
 * supabase.js — Supabase Client Initialization
 * 
 * Creates and exports a singleton Supabase client configured from environment variables.
 * When credentials are not available, falls back to demo mode using localStorage adapters.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Whether a real Supabase instance is configured.
 * When false, the app operates in demo mode with localStorage-backed data.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

/**
 * Supabase client instance.
 * In demo mode, this is a minimal stub — all data flows through the adapter layer.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export default supabase;
