import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder') || supabaseUrl === '111') {
  console.warn('⚠️ SUPABASE CONFIGURATION MISSING OR INVALID!');
  console.log('Current URL:', supabaseUrl || 'UNDEFINED');
  console.log('Current Key:', supabaseAnonKey ? `DEFINED (Prefix: ${supabaseAnonKey.substring(0, 5)}...)` : 'UNDEFINED');
  console.log('Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables in AI Studio Settings -> Secrets.');
}

// Ensure the URL is valid or fallback to a known non-crashing but failing-on-fetch URL
const finalUrl = (supabaseUrl && supabaseUrl.startsWith('http')) ? supabaseUrl : 'https://missing-supabase-url.supabase.co';

export const supabase = createClient(finalUrl, supabaseAnonKey || 'missing-key');
