'use server';

import { createClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/supabase/config';
import { redirect } from 'next/navigation';
import type { UserRole, Profile } from '@/types/database.types';

export type AuthResult = {
  success: boolean;
  message?: string;
  redirectTo?: string;
  error?: string;
};

/**
 * Sign in with email and password
 */
export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const intendedRole = (formData.get('role') as UserRole) || 'CUSTOMER';
  const customRedirect = formData.get('redirect') as string | null;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return { success: false, error: error?.message || 'Invalid email or password.' };
  }

  // Fetch user profile to verify role
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const profile = profileData as unknown as Profile | null;

  if (profileError || !profile) {
    return { success: false, error: 'Account profile not found. Please contact support.' };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { success: false, error: 'Your account has been suspended. Please contact support.' };
  }

  // Validate that user is not trying to login to admin/restaurant with unauthorized role
  if (intendedRole === 'ADMIN' && profile.role !== 'ADMIN') {
    await supabase.auth.signOut();
    return { success: false, error: 'Access denied: Admin credentials required.' };
  }

  if (intendedRole === 'RESTAURANT_OWNER' && profile.role !== 'RESTAURANT_OWNER' && profile.role !== 'ADMIN') {
    await supabase.auth.signOut();
    return { success: false, error: 'Access denied: Restaurant partner credentials required.' };
  }

  if (intendedRole === 'DELIVERY_PARTNER' && profile.role !== 'DELIVERY_PARTNER' && profile.role !== 'ADMIN') {
    await supabase.auth.signOut();
    return { success: false, error: 'Access denied: Delivery partner credentials required.' };
  }

  // Determine redirect URL
  let targetUrl = '/';
  if (customRedirect && customRedirect.startsWith('/')) {
    targetUrl = customRedirect;
  } else if (profile.role === 'ADMIN') {
    targetUrl = '/admin/dashboard';
  } else if (profile.role === 'RESTAURANT_OWNER') {
    targetUrl = '/restaurant/dashboard';
  } else if (profile.role === 'DELIVERY_PARTNER') {
    targetUrl = '/driver/dashboard';
  }

  return { success: true, redirectTo: targetUrl };
}

/**
 * Sign up new user (Customer, Restaurant Owner, or Delivery Partner)
 */
export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const phone = formData.get('phone') as string;
  const role = (formData.get('role') as UserRole) || 'CUSTOMER';

  if (!email || !password || !fullName) {
    return { success: false, error: 'Full name, email, and password are required.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  // Allow CUSTOMER, RESTAURANT_OWNER, or DELIVERY_PARTNER self-signup. ADMIN cannot self-signup.
  const targetRole: UserRole =
    role === 'RESTAURANT_OWNER'
      ? 'RESTAURANT_OWNER'
      : role === 'DELIVERY_PARTNER'
      ? 'DELIVERY_PARTNER'
      : 'CUSTOMER';

  const supabase = await createClient();

  const appUrl = getAppUrl();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(
        targetRole === 'RESTAURANT_OWNER'
          ? '/restaurant/dashboard'
          : targetRole === 'DELIVERY_PARTNER'
          ? '/driver/dashboard'
          : '/'
      )}`,
      data: {
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : null,
        role: targetRole,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: 'Failed to create user account.' };
  }

  // Determine redirect URL
  const targetUrl =
    targetRole === 'RESTAURANT_OWNER'
      ? '/restaurant/dashboard'
      : targetRole === 'DELIVERY_PARTNER'
      ? '/driver/dashboard'
      : '/';

  return {
    success: true,
    message: 'Account created successfully!',
    redirectTo: targetUrl,
  };
}

/**
 * Sign out current user
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Request password reset email
 */
export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;

  if (!email) {
    return { success: false, error: 'Email address is required.' };
  }

  const supabase = await createClient();
  const origin = getAppUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: 'Password reset link has been sent to your email address.',
  };
}

/**
 * Reset password with token
 */
export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const password = formData.get('password') as string;

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: 'Password updated successfully. You can now login.',
    redirectTo: '/login',
  };
}

/**
 * Get current session user and profile
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (profile as unknown as Profile) || null;
}
