import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';

export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
