import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSupabaseConfigured,
  supabase,
  getSafeProjectInfo,
  testSupabaseConnection
} from '../lib/supabase.js';

test('Supabase Client & Safe Connection Tests', async (t) => {
  await t.test('1. Validates safe project information masking', () => {
    const info = getSafeProjectInfo();
    assert.ok(typeof info.isConfigured === 'boolean', 'isConfigured should be boolean');
    assert.ok(typeof info.maskedHost === 'string', 'maskedHost should be string');
    
    // Crucial security check: Host string must never reveal private tokens
    assert.equal(info.maskedHost.includes('sb_publishable_'), false, 'Masked host must never contain secret keys');
    assert.equal(info.maskedHost.includes('service_role'), false, 'Masked host must never contain service role keys');
  });

  await t.test('2. Exports singleton Supabase client or safe null in unconfigured mode', () => {
    if (isSupabaseConfigured) {
      assert.ok(supabase, 'supabase client should be instantiated when configured');
      assert.ok(typeof supabase.from === 'function', 'client should expose table query interface');
      assert.ok(typeof supabase.auth === 'function' || typeof supabase.auth === 'object', 'client should expose auth interface');
    } else {
      assert.equal(supabase, null, 'supabase client should be safely null when unconfigured');
    }
  });

  await t.test('3. Executes safe connection test without exposing credentials', async () => {
    const diag = await testSupabaseConnection();
    
    assert.ok(typeof diag.connected === 'boolean', 'connected must be boolean');
    assert.ok(typeof diag.status === 'string', 'status must be a recognized string');
    assert.ok(['CONNECTED', 'SCHEMA_PENDING', 'UNCONFIGURED', 'ERROR'].includes(diag.status), `status '${diag.status}' must be recognized`);
    assert.ok(typeof diag.message === 'string', 'message must be string');
    assert.ok(typeof diag.latencyMs === 'number', 'latencyMs must be number');
    assert.ok(Array.isArray(diag.tablesFound), 'tablesFound must be array');

    // Security assertions: diagnostic output must never contain secret keys
    const serialized = JSON.stringify(diag);
    assert.equal(serialized.includes('sb_publishable_'), false, 'Diagnostics must not leak publishable key');
    assert.equal(serialized.includes('service_role'), false, 'Diagnostics must not leak service role key');
    assert.equal(serialized.includes('secret'), false, 'Diagnostics must not leak secrets');
  });
});
