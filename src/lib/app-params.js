const isNode = typeof window === 'undefined';

const normalizeUrl = (value) => (value || '').trim().replace(/\/+$/, '');

export const appParams = {
  appBaseUrl: normalizeUrl(import.meta.env.VITE_APP_BASE_URL) || (isNode ? '' : window.location.origin),
  supabaseUrl: normalizeUrl(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
};

export const missingSupabaseConfig = [
  !appParams.supabaseUrl && 'VITE_SUPABASE_URL',
  !appParams.supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean);

export const hasSupabaseConfig = missingSupabaseConfig.length === 0;
