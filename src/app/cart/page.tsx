import { Navbar } from '@/components/navbar';
import { getCart } from '@/actions/cart';
import { CartView } from '@/components/cart/cart-view';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/actions/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Cart | QuickBite',
  description: 'Review your food items and calculate final delivery fees and taxes.',
};

export default async function CartPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login?redirect=/cart');
  }

  const cart = await getCart();

  if (!cart) {
    redirect('/restaurants');
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Review Your Order
        </h1>

        <CartView initialCart={cart} />
      </main>
    </div>
  );
}
