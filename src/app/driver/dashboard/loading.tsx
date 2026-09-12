import { Skeleton } from '@/components/ui/skeleton';

export default function DriverDashboardLoading() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <div className="h-16 border-b border-stone-200 bg-white/80" />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
