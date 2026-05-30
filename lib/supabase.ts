import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConfigError = hasSupabaseConfig
  ? null
  : 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in the build environment.';

type SupabaseClientInstance = SupabaseClient<Database>;

const missingConfigHandler: ProxyHandler<SupabaseClientInstance> = {
  get() {
    throw new Error(
      supabaseConfigError ?? 'Supabase is not configured for this build.'
    );
  },
};

let supabaseInstance: SupabaseClientInstance;

if (supabaseUrl && supabaseAnonKey) {
  // Lazy-load RN-only modules so jest (node env, no RN transform) can still
  // load this file via transitive imports without exploding.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppState } = require('react-native');

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Survive Fast Refresh: store the subscription handle on globalThis so a
  // re-run of this module body can tear down the prior listener instead of
  // stacking N copies that all churn token refreshes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.__adpt_supabase_appstate_sub__?.remove?.();
  g.__adpt_supabase_appstate_sub__ = AppState.addEventListener('change', (next: string) => {
    if (next === 'active') {
      supabaseInstance.auth.startAutoRefresh();
    } else {
      supabaseInstance.auth.stopAutoRefresh();
    }
  });
} else {
  supabaseInstance = new Proxy(
    {} as SupabaseClientInstance,
    missingConfigHandler
  );
}

export const supabase = supabaseInstance;
