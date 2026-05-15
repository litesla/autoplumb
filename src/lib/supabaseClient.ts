import { createClient } from '@supabase/supabase-js';

// Use keys from localStorage (set via Admin Diagnostics) OR environment variables OR hardcoded default
const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_key') : null;

  return {
    url: localUrl || import.meta.env.VITE_SUPABASE_URL || 'https://qllpxployhzizlicxbss.supabase.co',
    key: localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Bcon0479bh1HqnkUuvztCQ_99QwQW_DqN1zK3I6o6N5O8'
  };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
