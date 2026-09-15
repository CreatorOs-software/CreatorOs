import { Skeleton } from "@talentos/ui";

export function OrbitInboxSkeleton() {
  return (
    <div className="flex h-full min-w-0 overflow-hidden gap-2">
      <div className="flex flex-1 min-w-0 overflow-hidden rounded-2xl bg-white">
        {/* Sidebar */}
        <div className="flex w-72 shrink-0 flex-col gap-1 overflow-hidden border-r border-[#E7E7E7] p-4">
          <Skeleton className="h-8 w-full rounded-md mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>

        {/* Thread list */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-[#E7E7E7]">
          <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
          <div className="px-4 pb-2 pt-3">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="flex-1 overflow-hidden py-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-4 py-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-1/2" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
