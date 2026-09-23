import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://qllpxployhzizlicxbss.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHB4cGxveWh6aXpsaWN4YnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYxNTIsImV4cCI6MjA5NDE4MjE1Mn0.DvlD5gCVPaTdg64ibGcIucsCjLJiIUk4PMNFxSqECiM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

