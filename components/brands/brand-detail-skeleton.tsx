import { Card, Skeleton } from "@talentos/ui";

export function BrandDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header card */}
      <Card className="rounded-2xl p-6 gap-0">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-64" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-4 shrink-0">
            <Skeleton className="h-8 w-32 rounded-md" />
            <div className="flex items-center gap-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_360px] gap-5 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <Card className="rounded-2xl p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-32" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </Card>
          <Card className="rounded-2xl p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-36" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <Skeleton className="h-3 w-24 shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl p-5 flex flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
