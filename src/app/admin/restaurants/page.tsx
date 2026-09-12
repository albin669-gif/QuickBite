import { getAdminRestaurants } from '@/actions/admin';
import { AdminRestaurantsView } from '@/components/admin/admin-restaurants-view';

export default async function AdminRestaurantsPage() {
  const restaurants = await getAdminRestaurants();

  return (
    <div className="p-6 sm:p-8">
      <AdminRestaurantsView initialRestaurants={restaurants} />
    </div>
  );
}
