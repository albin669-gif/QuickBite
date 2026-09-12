import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recover Password | QuickBite',
  description: 'Reset your forgotten password.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="forgot-password"
          title="Reset Password"
          subtitle="Enter your email to receive recovery instructions"
          footerPrompt="Remember your credentials?"
          footerLinkText="Back to sign in"
          footerLinkHref="/login"
        />
      </Suspense>
    </div>
  );
}
