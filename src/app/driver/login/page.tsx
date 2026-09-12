import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery Partner Portal | QuickBite',
  description: 'Log in to your QuickBite delivery partner dashboard.',
};

export default function DriverLoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="login"
          role="DELIVERY_PARTNER"
          title="Delivery Partner Portal"
          subtitle="Sign in to pick up orders and start delivering"
          footerPrompt="Want to deliver with QuickBite?"
          footerLinkText="Register as a Delivery Partner"
          footerLinkHref="/driver/signup"
        />
      </Suspense>
    </div>
  );
}
