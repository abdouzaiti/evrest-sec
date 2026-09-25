import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Dedicated credentials for Everest Academy Supabase project
const SUPABASE_PROJECT_URL = 'https://exoewaxtjfopqgxolqph.supabase.co';
const SUPABASE_PROJECT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b2V3YXh0amZvcHFneG9scXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDI2NzUsImV4cCI6MjA5NzI3ODY3NX0.1XX-Nlfkmj4XSiiwAVYGz-QfmyjUxikr8yUFEufRWpQ';

export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_PROJECT_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_PROJECT_ANON_KEY;
  return { url, anonKey };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  return !!(url && anonKey);
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return {} as SupabaseClient;
  }

  supabaseInstance = createClient(url, anonKey);
  return supabaseInstance;
};

// For backward compatibility with existing imports
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const instance = getSupabase();
    return (instance as any)[prop];
  }
});
