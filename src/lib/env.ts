/**
 * QuickBite - Production Environment Validation Helper
 * Ensures all required services (Supabase, Razorpay, App URLs) are properly configured.
 * Never logs or returns secret values.
 */

export interface EnvValidationResult {
  isValid: boolean;
  isProduction: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Required Supabase Variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  } else if (
    isProduction &&
    (process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('example.com'))
  ) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL contains placeholder domain in production.');
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  // Razorpay Configuration
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    if (isProduction) {
      missing.push('NEXT_PUBLIC_RAZORPAY_KEY_ID');
    } else {
      warnings.push('NEXT_PUBLIC_RAZORPAY_KEY_ID is missing; falling back to dev mode.');
    }
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    if (isProduction) {
      missing.push('RAZORPAY_KEY_SECRET');
    } else {
      warnings.push('RAZORPAY_KEY_SECRET is missing; falling back to dev mode.');
    }
  }

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    if (isProduction) {
      missing.push('RAZORPAY_WEBHOOK_SECRET');
    } else {
      warnings.push('RAZORPAY_WEBHOOK_SECRET is not configured for webhooks in dev mode.');
    }
  }

  const isValid = missing.length === 0 && errors.length === 0;

  return {
    isValid,
    isProduction,
    missing,
    warnings,
    errors,
  };
}

/**
 * Throws a formatted error in production if critical environment variables are absent.
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const result = validateEnvironment();
  if (!result.isValid) {
    const errorDetails = [
      result.missing.length ? `Missing variables: ${result.missing.join(', ')}` : '',
      result.errors.length ? `Config errors: ${result.errors.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    throw new Error(`[CRITICAL] Production environment check failed: ${errorDetails}`);
  }
}
