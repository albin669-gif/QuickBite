import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/actions/admin';
import { getAllReviewsAdminAction } from '@/actions/review';
import { AdminReviewsView } from '@/components/admin/admin-reviews-view';

export const metadata = {
  title: 'Review Moderation - Admin Console | QuickBite',
};

export default async function AdminReviewsPage() {
  const admin = await verifyAdmin();
  if (!admin) {
    redirect('/auth/login?role=admin');
  }

  const res = await getAllReviewsAdminAction();
  const reviews = res.success && res.data ? res.data : [];

  return <AdminReviewsView initialReviews={reviews} />;
}
