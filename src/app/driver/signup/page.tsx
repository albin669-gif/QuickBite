import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join as Delivery Partner | QuickBite',
  description: 'Sign up to become a delivery partner and earn with QuickBite.',
};

export default function DriverSignupPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="signup"
          role="DELIVERY_PARTNER"
          title="Join as a Delivery Partner"
          subtitle="Flexible hours, competitive earnings, and weekly payouts"
          footerPrompt="Already registered as a driver?"
          footerLinkText="Sign in to Driver Portal"
          footerLinkHref="/driver/login"
        />
      </Suspense>
    </div>
  );
}
