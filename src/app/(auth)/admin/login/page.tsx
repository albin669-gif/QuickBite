import React, { Suspense } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Administration Login | QuickBite',
  description: 'Administrative access for QuickBite operations team.',
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="text-center text-sm text-stone-400">Loading admin console...</div>}>
        <AuthForm
          mode="login"
          role="ADMIN"
          title="Admin Control Center"
          subtitle="Authorized personnel only. All access is logged and audited."
        />
      </Suspense>
    </div>
  );
}
