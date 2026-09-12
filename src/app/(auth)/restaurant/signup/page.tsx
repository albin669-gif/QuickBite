import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner With QuickBite | Restaurant Registration',
  description: 'Register your restaurant on QuickBite to start accepting online orders.',
};

export default function RestaurantSignupPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="signup"
          role="RESTAURANT_OWNER"
          title="Partner Registration"
          subtitle="Join India's fastest growing restaurant delivery network"
          footerPrompt="Already a registered partner?"
          footerLinkText="Sign in to portal"
          footerLinkHref="/restaurant/login"
        />
      </Suspense>
    </div>
  );
}
