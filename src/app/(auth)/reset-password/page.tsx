import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set New Password | QuickBite',
  description: 'Enter your new secure password.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading form...</div>}>
        <AuthForm
          mode="reset-password"
          title="New Password"
          subtitle="Choose a secure password for your account"
        />
      </Suspense>
    </div>
  );
}
