import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from './config';

export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client initialization');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
