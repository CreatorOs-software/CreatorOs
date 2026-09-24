"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, CalendarClock, Inbox, ReceiptText } from "lucide-react";
import { Badge, Card, Skeleton } from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/domains/notifications/types";

const REACTION_TYPES = new Set<NotificationType>([
  "INCOMING_REQUEST_STALE",
  "REQUEST_STALE",
  "DRAFT_DUE_SOON",
  "DRAFT_OVERDUE",
  "INVOICE_DUE_SOON",
  "INVOICE_OVERDUE",
  "PAYOUT_PENDING",
]);

const TYPE_ICON: Partial<Record<NotificationType, typeof AlertCircle>> = {
  INCOMING_REQUEST_STALE: Inbox,
  REQUEST_STALE: Inbox,
  DRAFT_DUE_SOON: CalendarClock,
  DRAFT_OVERDUE: CalendarClock,
  INVOICE_DUE_SOON: ReceiptText,
  INVOICE_OVERDUE: ReceiptText,
  PAYOUT_PENDING: ReceiptText,
};

type NotificationsResponse = { notifications: Notification[] };

export function ReactionRequiredCard({ className }: { className?: string }) {
  const router = useRouter();
  const { data, isPending } = useQuery<NotificationsResponse>({
    queryKey: QueryKeys.notifications.all(),
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Hinweise konnten nicht geladen werden");
      return response.json() as Promise<NotificationsResponse>;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const allItems = (data?.notifications ?? [])
    .filter((item) => item.status === "OPEN" && REACTION_TYPES.has(item.type))
    .toSorted((a, b) => {
      if (a.severity !== b.severity) return a.severity === "LAUT" ? -1 : 1;
      return b.stage - a.stage;
    });
  const items = allItems.slice(0, 4);

  return (
    <Card className={cn("flex h-full flex-col gap-(--tui-space-sm) p-(--tui-space-md)", className)}>
      <div className="flex items-start justify-between gap-(--tui-space-xs)">
        <div>
          <p className="text-lg font-semibold text-foreground">Reaktion erforderlich</p>
          <p className="mt-(--tui-space-3xs) text-xs text-muted-foreground">
            Offene Vorgänge mit Handlungsbedarf
          </p>
        </div>
        <Badge variant={items.some((item) => item.severity === "LAUT") ? "destructive" : "outline"}>
          {allItems.length}
        </Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {isPending ? (
          <div className="flex flex-col gap-(--tui-space-xs)">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="grid size-9 place-items-center rounded-(--tui-radius-md) bg-muted text-muted-foreground">
              <AlertCircle className="size-4" />
            </span>
            <p className="mt-(--tui-space-xs) text-sm font-medium">Alles im grünen Bereich</p>
            <p className="mt-(--tui-space-3xs) text-xs text-muted-foreground">Aktuell ist keine Reaktion überfällig.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const Icon = TYPE_ICON[item.type] ?? AlertCircle;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.href && router.push(item.href)}
                  className="flex w-full items-center gap-(--tui-space-xs) py-(--tui-space-xs) text-left transition-colors hover:text-brand"
                >
                  <span className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-(--tui-radius-sm) bg-muted text-muted-foreground",
                    item.severity === "LAUT" && "bg-destructive/10 text-destructive",
                  )}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{item.title}</span>
                    <span className="mt-(--tui-space-3xs) block truncate text-[11px] text-muted-foreground">{item.reason}</span>
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
