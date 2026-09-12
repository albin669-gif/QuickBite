import { Navbar } from '@/components/navbar';
import { getCart, validateCoupon } from '@/actions/cart';
import { getCustomerAddresses } from '@/actions/address';
import { getCurrentUserProfile } from '@/actions/auth';
import { redirect } from 'next/navigation';
import { CheckoutView } from '@/components/checkout/checkout-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Checkout | QuickBite',
  description: 'Select delivery address, payment method, and complete your food order.',
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ coupon?: string }>;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login?redirect=/checkout');
  }

  const cart = await getCart();

  if (!cart || cart.items.length === 0) {
    redirect('/cart');
  }

  const addresses = await getCustomerAddresses();

  // Validate coupon if present in URL
  const resolvedParams = await searchParams;
  let couponData = null;
  let discountAmount = 0;

  if (resolvedParams.coupon) {
    const couponRes = await validateCoupon(resolvedParams.coupon, cart.subtotal);
    if (couponRes.valid && couponRes.coupon) {
      couponData = couponRes.coupon;
      discountAmount = couponRes.discountAmount;
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Secure Checkout
        </h1>

        <CheckoutView
          cart={cart}
          addresses={addresses}
          coupon={couponData}
          discountAmount={discountAmount}
          customerProfile={profile}
        />
      </main>
    </div>
  );
}
