import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';
import { env } from '@/utils/env';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    // Session (access + refresh tokens) persists in expo-sqlite/localStorage: plaintext but
    // confined to the app sandbox and encrypted at rest by the OS (iOS Data Protection /
    // Android FBE). Accepted risk for v1 — the real boundary is RLS + short-lived access
    // tokens + refresh-token rotation, not disk secrecy. Post-launch hardening: wrap the value
    // with an AES key held in expo-secure-store (Keychain/Keystore) to avoid SecureStore's
    // ~2KB Android value limit that a full session would exceed.
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
