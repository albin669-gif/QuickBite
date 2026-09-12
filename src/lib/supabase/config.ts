/**
 * Centralized Supabase Configuration & URL Normalizer
 *
 * Prevents "Invalid path specified in request URL" errors caused by accidental
 * trailing slashes, /rest/v1, /auth/v1, or quotation marks in environment variables.
 */

export function sanitizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return 'https://placeholder.supabase.co';
  let cleaned = rawUrl.trim();

  // Strip wrapping single or double quotes (common when copying from env files)
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Strip accidental PostgREST / Auth subpaths appended to the base URL
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/auth\/v1\/?$/, '');

  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  return cleaned || 'https://placeholder.supabase.co';
}

export function sanitizeKey(rawKey?: string): string {
  if (!rawKey) return '';
  let cleaned = rawKey.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function getSupabaseUrl(): string {
  return sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return sanitizeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder';
}

export function getSupabaseServiceRoleKey(): string {
  return sanitizeKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}
