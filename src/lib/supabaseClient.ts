import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Loop prevention: check if keys are placeholders or missing
const isConfigMissing = !supabaseUrl || !supabaseAnonKey || 
                        supabaseUrl.includes('placeholder') || 
                        supabaseUrl.includes('missing-supabase-url') ||
                        supabaseUrl === '111';

if (isConfigMissing) {
  console.warn('⚠️ Supabase config is missing or invalid. Requests are blocked.');
}

// Ensure the URL is valid or fallback to a known non-crashing URL
const finalUrl = (supabaseUrl && supabaseUrl.startsWith('http')) ? supabaseUrl : 'https://qllpxployhzizlicxbss.supabase.co';

export const supabase = createClient(finalUrl, supabaseAnonKey || 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (...args) => {
      if (isConfigMissing) {
        console.error('🚫 Blocked Supabase request due to missing configuration.');
        return Promise.reject(new Error('Supabase configuration missing'));
      }
      return fetch(...args);
    }
  }
});
