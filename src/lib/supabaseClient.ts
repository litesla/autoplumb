import { createClient } from '@supabase/supabase-js';

// Permanent Supabase configuration for the entire site
const supabaseUrl = 'https://qllpxployhzizlicxbss.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHB4cGxveWh6aXpsaWN4YnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYxNTIsImV4cCI6MjA5NDE4MjE1Mn0.DvlD5gCVPaTdg64ibGcIucsCjLJiIUk4PMNFxSqECiM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
