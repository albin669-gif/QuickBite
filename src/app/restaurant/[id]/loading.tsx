import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantDetailLoading() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="h-16 border-b border-stone-200 bg-white/80" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Restaurant Hero Skeleton */}
        <div className="relative h-64 sm:h-80 w-full bg-stone-200 rounded-3xl overflow-hidden p-6 sm:p-8 flex flex-col justify-end space-y-3">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Menu Navigation Skeleton */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-2xl shrink-0" />
          ))}
        </div>

        {/* Menu Items Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-sm flex items-start justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
