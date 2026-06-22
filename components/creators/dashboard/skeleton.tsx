import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="-mx-6 px-6 mb-4 flex items-end justify-between bg-card border-b border-border">
        <div className="flex gap-6 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-18" />
        </div>
        <Skeleton className="h-7 w-28 mb-0.5 rounded-md" />
      </div>

      {/* Content — mirrors Übersicht layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 pb-6">
        {/* Left column */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <div className="bg-card rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-4" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="w-1.5 h-1.5 rounded-full shrink-0" />
                <Skeleton className="w-6 h-6 rounded-md shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-5 flex flex-col gap-3">
                <Skeleton className="h-4 w-24" />
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-2 py-1">
                    <Skeleton className="w-6 h-6 rounded-md shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-14 shrink-0" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl p-5">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="bg-card rounded-2xl p-5 flex flex-col gap-4">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-lg" />
              ))}
            </div>
            <div className="h-px bg-border-light" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
            <div className="h-px bg-border-light" />
            <Skeleton className="h-9 w-28" />
          </div>

          <div className="bg-card rounded-2xl p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-baseline justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <Skeleton className="w-1.5 h-1.5 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
