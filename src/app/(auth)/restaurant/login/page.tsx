import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Restaurant Partner Portal | QuickBite',
  description: 'Log in to your QuickBite restaurant management dashboard.',
};

export default function RestaurantLoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="login"
          role="RESTAURANT_OWNER"
          title="Restaurant Partner Portal"
          subtitle="Manage your orders, menu, and kitchen in real-time"
          footerPrompt="Want to partner with QuickBite?"
          footerLinkText="Register your restaurant"
          footerLinkHref="/restaurant/signup"
        />
      </Suspense>
    </div>
  );
}
