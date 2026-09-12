import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Login | QuickBite',
  description: 'Log in to your QuickBite account to order delicious Indian food.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="login"
          role="CUSTOMER"
          title="Welcome Back"
          subtitle="Sign in to your QuickBite account"
          footerPrompt="Don't have an account?"
          footerLinkText="Create a new account"
          footerLinkHref="/signup"
        />
      </Suspense>
    </div>
  );
}
