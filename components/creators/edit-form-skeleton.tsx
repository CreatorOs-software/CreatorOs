import { Skeleton } from "@talentos/ui";

export function EditFormSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-card rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-6 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="w-8 h-8 rounded-md" />
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>

          <div className="mb-8 flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-2 flex-1 rounded-full" />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
