import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantsLoading() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="h-16 border-b border-stone-200 bg-white/80" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-full md:w-80 rounded-2xl" />
        </div>

        {/* Cuisine Bar Skeleton */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
          ))}
        </div>

        {/* Filters Bar Skeleton */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-36 rounded-xl" />
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div>
                <Skeleton className="h-48 w-full rounded-none" />
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-6 w-12 rounded-lg" />
                  </div>
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="px-5 py-3.5 border-t border-stone-100 flex justify-between bg-stone-50/50">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
