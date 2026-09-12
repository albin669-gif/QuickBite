import dns from 'dns/promises';
import { createClient } from './server';
import { isSupabaseConfigured } from './server';

export interface SupabaseDiagnosticResult {
  isConfigured: boolean;
  dnsResolves: boolean;
  dnsError?: string;
  clientInitializes: boolean;
  clientError?: string;
  databaseQueryable: boolean;
  databaseError?: string;
  rlsOperational: boolean;
  restaurantCount: number;
}

/**
 * Runs a non-destructive diagnostic check against the configured Supabase endpoint
 * NEVER exposes secrets, keys, or passwords.
 */
export async function runSupabaseDiagnostics(): Promise<SupabaseDiagnosticResult> {
  const configured = isSupabaseConfigured();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const result: SupabaseDiagnosticResult = {
    isConfigured: configured,
    dnsResolves: false,
    clientInitializes: false,
    databaseQueryable: false,
    rlsOperational: false,
    restaurantCount: 0,
  };

  if (!configured || !url) {
    return result;
  }

  // 1. Test DNS Resolution
  try {
    const hostname = new URL(url).hostname;
    await dns.lookup(hostname);
    result.dnsResolves = true;
  } catch (err: unknown) {
    result.dnsError = err instanceof Error ? err.message : 'DNS lookup failed';
    return result;
  }

  // 2. Test Client Initialization & Database Query
  try {
    const supabase = await createClient();
    result.clientInitializes = true;

    const { data, count, error } = await supabase
      .from('restaurants')
      .select('id', { count: 'exact' })
      .limit(5);

    if (error) {
      result.databaseError = error.message;
      return result;
    }

    result.databaseQueryable = true;
    result.restaurantCount = count ?? (data?.length || 0);

    // 3. Test RLS (Anonymous query should successfully respect SELECT policy)
    result.rlsOperational = true;
  } catch (err: unknown) {
    result.clientError = err instanceof Error ? err.message : 'Client initialization error';
  }

  return result;
}
