'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signUp, forgotPassword, resetPassword } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import type { UserRole } from '@/types/database.types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'signup' | 'forgot-password' | 'reset-password';
  role?: UserRole;
  title: string;
  subtitle: string;
  footerPrompt?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
}

export function AuthForm({
  mode,
  role = 'CUSTOMER',
  title,
  subtitle,
  footerPrompt,
  footerLinkText,
  footerLinkHref,
}: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '';

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('role', role);
    if (redirectParam) {
      formData.append('redirect', redirectParam);
    }

    try {
      if (mode === 'login') {
        const result = await signIn(formData);
        if (!result.success) {
          setErrorMessage(result.error || 'Failed to sign in.');
          setLoading(false);
        } else {
          router.push(result.redirectTo || '/');
          router.refresh();
        }
      } else if (mode === 'signup') {
        const result = await signUp(formData);
        if (!result.success) {
          setErrorMessage(result.error || 'Failed to sign up.');
          setLoading(false);
        } else {
          setSuccessMessage(result.message || 'Account created successfully!');
          setTimeout(() => {
            router.push(result.redirectTo || '/');
            router.refresh();
          }, 1000);
        }
      } else if (mode === 'forgot-password') {
        const result = await forgotPassword(formData);
        if (!result.success) {
          setErrorMessage(result.error || 'Failed to send reset link.');
        } else {
          setSuccessMessage(result.message || 'Reset link sent!');
        }
        setLoading(false);
      } else if (mode === 'reset-password') {
        const result = await resetPassword(formData);
        if (!result.success) {
          setErrorMessage(result.error || 'Failed to reset password.');
        } else {
          setSuccessMessage(result.message || 'Password reset successfully!');
          setTimeout(() => {
            router.push(result.redirectTo || '/login');
          }, 1500);
        }
        setLoading(false);
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/80 p-6 sm:p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        <p className="mt-1.5 text-sm text-stone-500">{subtitle}</p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-emerald-700 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              required
            />
            <Input
              id="phone"
              name="phone"
              type="tel"
              label="Phone Number"
              placeholder="+91 98765 43210"
            />
          </>
        )}

        {mode !== 'reset-password' && (
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        )}

        {mode !== 'forgot-password' && (
          <div>
            <Input
              id="password"
              name="password"
              type="password"
              label={mode === 'reset-password' ? 'New Password' : 'Password'}
              placeholder="••••••••"
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {mode === 'login' && (
              <div className="flex justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-orange-600 hover:text-orange-700"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={loading}
        >
          {mode === 'login' && 'Sign In'}
          {mode === 'signup' && (role === 'RESTAURANT_OWNER' ? 'Register Restaurant' : 'Create Account')}
          {mode === 'forgot-password' && 'Send Reset Link'}
          {mode === 'reset-password' && 'Set New Password'}
        </Button>
      </form>

      {footerPrompt && footerLinkText && footerLinkHref && (
        <div className="mt-6 text-center text-xs text-stone-600 border-t border-stone-100 pt-4">
          {footerPrompt}{' '}
          <Link
            href={footerLinkHref}
            className="font-semibold text-orange-600 hover:text-orange-700"
          >
            {footerLinkText}
          </Link>
        </div>
      )}
    </div>
  );
}
