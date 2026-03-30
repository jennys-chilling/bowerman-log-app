import { createClient } from '@supabase/supabase-js';
import { appParams, hasSupabaseConfig, missingSupabaseConfig } from './app-params';

export const supabase = hasSupabaseConfig
  ? createClient(appParams.supabaseUrl, appParams.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const assertSupabaseConfigured = () => {
  if (!supabase) {
    const error = new Error(
      `Missing Supabase environment variables: ${missingSupabaseConfig.join(', ')}`
    );
    error.status = 500;
    throw error;
  }

  return supabase;
};
