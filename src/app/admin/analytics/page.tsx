import { getAdminMetrics } from '@/actions/admin';
import { AdminAnalyticsView } from '@/components/admin/admin-analytics-view';

export default async function AdminAnalyticsPage() {
  const metrics = await getAdminMetrics('all');

  return (
    <div className="p-6 sm:p-8">
      <AdminAnalyticsView initialMetrics={metrics} />
    </div>
  );
}
