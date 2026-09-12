import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  return Boolean(url && !url.includes('placeholder') && !url.includes('example'));
}

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored if handled in middleware
          }
        },
      },
    }
  );
}
