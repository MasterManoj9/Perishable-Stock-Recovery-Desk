/**
 * supabase.js — Supabase Client Initialization & Safe Connection Diagnostics
 * 
 * Creates and exports a singleton Supabase client configured from environment variables.
 * Compatible with Vite environment variables:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY)
 * 
 * Provides defense-in-depth:
 * 1. Never exposes raw secret keys or tokens.
 * 2. When tables or credentials are not yet ready, safely falls back to local adapters.
 * 3. Exports testSupabaseConnection() to check reachability and schema status.
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
const rawKey = (typeof import.meta !== 'undefined' && (
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env?.VITE_SUPABASE_ANON_KEY
)) || (typeof process !== 'undefined' && (
  process.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env?.VITE_SUPABASE_ANON_KEY
)) || '';

const supabaseUrl = String(rawUrl).trim();
const supabaseKey = String(rawKey).trim();

/**
 * Whether a real Supabase instance is configured with valid non-placeholder values.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseKey.includes('your-') &&
  supabaseKey.length > 20
);

/**
 * Supabase client instance.
 * When isSupabaseConfigured is false, null is exported so caller layers
 * safely fallback to local storage adapters without crashing.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Returns a masked version of the Supabase project host for safe UI display.
 * Example: "putl...ku.supabase.co"
 */
export function getSafeProjectInfo() {
  if (!supabaseUrl) return { isConfigured: false, maskedHost: 'Not Configured' };
  try {
    const parsed = new URL(supabaseUrl);
    const host = parsed.hostname;
    const parts = host.split('.');
    const ref = parts[0] || '';
    const maskedRef = ref.length > 6 
      ? `${ref.slice(0, 4)}...${ref.slice(-2)}`
      : ref;
    return {
      isConfigured: isSupabaseConfigured,
      maskedHost: `${maskedRef}.${parts.slice(1).join('.')}`
    };
  } catch {
    return { isConfigured: false, maskedHost: 'Invalid URL' };
  }
}

/**
 * Safe connection test that checks whether the client can communicate
 * with the remote Supabase project without exposing any secret keys or credentials.
 * 
 * @returns {Promise<{
 *   connected: boolean,
 *   status: 'CONNECTED' | 'SCHEMA_PENDING' | 'AUTH_ONLY' | 'UNCONFIGURED' | 'ERROR',
 *   message: string,
 *   maskedHost: string,
 *   latencyMs: number,
 *   tablesFound: string[]
 * }>}
 */
export async function testSupabaseConnection() {
  const projectInfo = getSafeProjectInfo();

  if (!isSupabaseConfigured || !supabase) {
    return {
      connected: false,
      status: 'UNCONFIGURED',
      message: 'Supabase URL or Publishable Key is not configured in .env',
      maskedHost: projectInfo.maskedHost,
      latencyMs: 0,
      tablesFound: []
    };
  }

  const startTime = performance.now();
  try {
    // 1. Probe the database REST endpoint safely for the 'stores' table
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('id, code, name')
      .limit(1);

    const latencyMs = Math.round(performance.now() - startTime);

    if (storesError) {
      // PGRST205 or 42P01: Table does not exist in schema cache
      if (
        storesError.code === 'PGRST205' ||
        storesError.code === '42P01' ||
        storesError.message?.toLowerCase().includes('could not find the table') ||
        storesError.message?.toLowerCase().includes('does not exist')
      ) {
        return {
          connected: true, // Network reachability is confirmed!
          status: 'SCHEMA_PENDING',
          message: 'Connected to Supabase endpoint, but database tables are not yet created. Migrations 001, 002, and 003 must be run in the Supabase SQL Editor.',
          maskedHost: projectInfo.maskedHost,
          latencyMs,
          tablesFound: []
        };
      }

      // Other error (e.g., auth or RLS restriction)
      return {
        connected: false,
        status: 'ERROR',
        message: storesError.message || 'Database query failed',
        maskedHost: projectInfo.maskedHost,
        latencyMs,
        tablesFound: []
      };
    }

    // Tables exist and are accessible
    return {
      connected: true,
      status: 'CONNECTED',
      message: 'Successfully connected to Supabase and verified database tables.',
      maskedHost: projectInfo.maskedHost,
      latencyMs,
      tablesFound: ['stores']
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      connected: false,
      status: 'ERROR',
      message: err instanceof Error ? err.message : 'Network communication error',
      maskedHost: projectInfo.maskedHost,
      latencyMs,
      tablesFound: []
    };
  }
}

export default supabase;
