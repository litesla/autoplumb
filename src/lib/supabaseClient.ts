import { createClient } from '@supabase/supabase-js';

// Use keys from localStorage (set via Admin Diagnostics) OR environment variables OR hardcoded default
const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_key') : null;

  // Prioritize localStorage (user-set), then hardcoded working defaults.
  // We ignore VITE_ environment variables to avoid stale/old project keys from building environment.
  return {
    url: localUrl || 'https://qllpxployhzizlicxbss.supabase.co',
    key: localKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHB4cGxveWh6aXpsaWN4YnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYxNTIsImV4cCI6MjA5NDE4MjE1Mn0.DvlD5gCVPaTdg64ibGcIucsCjLJiIUk4PMNFxSqECiM'
  };
};

const { url, key } = getSupabaseConfig();

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
