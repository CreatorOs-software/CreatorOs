import { Skeleton } from "@talentos/ui";

export function CreatorsListSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-3 mb-4 mt-1">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-44 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-card p-6 flex flex-col">
              <div className="mb-5 flex justify-center">
                <Skeleton className="w-16 h-16 rounded-full" />
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-border">
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-4 w-6" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-4 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
