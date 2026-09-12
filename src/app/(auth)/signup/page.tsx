import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | QuickBite',
  description: 'Create a new QuickBite customer account to order food in India.',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="signup"
          role="CUSTOMER"
          title="Create an Account"
          subtitle="Join QuickBite for quick and fresh food delivery"
          footerPrompt="Already have an account?"
          footerLinkText="Sign in instead"
          footerLinkHref="/login"
        />
      </Suspense>
    </div>
  );
}
