import { Navbar } from '@/components/navbar';
import { getCustomerAddresses } from '@/actions/address';
import { getCurrentUserProfile } from '@/actions/auth';
import { redirect } from 'next/navigation';
import { AddressManager } from '@/components/customer/address-manager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Addresses | QuickBite',
  description: 'Manage your saved delivery addresses.',
};

export default async function AddressesPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login?redirect=/addresses');
  }

  const addresses = await getCustomerAddresses();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Saved Delivery Addresses
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage your Home, Work, and other delivery locations in India.
          </p>
        </div>

        <AddressManager initialAddresses={addresses} />
      </main>
    </div>
  );
}
