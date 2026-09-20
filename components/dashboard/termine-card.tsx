"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { Avatar } from "@/components/ui/avatar-creator";
import { Card, Skeleton } from "@talentos/ui";
import { cn } from "@/lib/utils";
import type { DealDeadline } from "@/domains/deals";
import type { Todo } from "@/domains/todos";
import { ReminderDialog } from "./reminder-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  location: string | null;
  creator_id: string | null;
  creators: { full_name: string; initials: string } | null;
};

type TermineRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  subtitle: string;
  creatorId: string | null;
  creators: { full_name: string; initials: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENTS_WINDOW_DAYS = 7;
const DEADLINE_WINDOW_DAYS = 3;

const TYPE_DOT: Record<string, string> = {
  shoot:    "bg-yellow-400",
  travel:   "bg-blue-500",
  deadline: "bg-red-500",
  posting:  "bg-green-500",
  brand:    "bg-purple-500",
  internal: "bg-gray-400",
  todo:     "bg-indigo-500",
};

const TYPE_LABEL: Record<string, string> = {
  shoot: "Shoot", travel: "Travel", deadline: "Deadline",
  posting: "Posting", brand: "Brand", internal: "Intern", todo: "To-do",
};

const PRIORITY_LABEL: Record<string, string> = {
  niedrig: "Niedrig", mittel: "Mittel", hoch: "Hoch",
};

const MONTH_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildReminderMessage(row: TermineRow, overdue: boolean): string {
  const name = row.creators?.full_name?.split(" ")[0] ?? "hey";
  const date = new Date(row.start_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const when = overdue ? `war am ${date} fällig` : `ist am ${date} fällig`;
  const what = row.type === "todo" ? "dein To-do" : "die Deadline für";
  return `Hey ${name}, kurze Erinnerung: ${what} „${row.title}“ ${when}. Kannst du kurz Bescheid geben, wie der Stand ist?`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TermineCardProps {
  className?: string;
}

export function TermineCard({ className }: TermineCardProps) {
  // Frozen for the component's lifetime — a fresh `new Date()` on every render
  // would change the query keys below on every render and cause a refetch loop.
  const now = useMemo(() => new Date(), []);
  const eventsTo = useMemo(() => addDays(now, EVENTS_WINDOW_DAYS), [now]);
  const deadlineCutoff = useMemo(() => addDays(now, DEADLINE_WINDOW_DAYS), [now]);

  const { data: eventsData, isPending: eventsPending } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [...QueryKeys.events.range(now.toISOString(), eventsTo.toISOString()), "all"],
    queryFn: () => {
      const params = new URLSearchParams({
        from: now.toISOString(),
        to: eventsTo.toISOString(),
      });
      return fetch(`/api/events?${params}`).then((r) => r.json());
    },
    staleTime: 5 * 60_000,
  });

  const { data: deadlinesData, isPending: deadlinesPending } = useQuery<{
    deadlines: DealDeadline[];
  }>({
    queryKey: QueryKeys.deals.deadlines(toDateOnly(deadlineCutoff)),
    queryFn: () => {
      const params = new URLSearchParams({ to: toDateOnly(deadlineCutoff) });
      return fetch(`/api/deals/deadlines?${params}`).then((r) => r.json());
    },
    staleTime: 5 * 60_000,
  });

  const { data: todosData, isPending: todosPending } = useQuery<{ todos: Todo[] }>({
    queryKey: QueryKeys.todos.all(),
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
    staleTime: 60_000,
  });

  const eventRows: TermineRow[] = (eventsData?.events ?? [])
    .filter((e) => {
      const t = new Date(e.start_at).getTime();
      return t >= now.getTime() && t <= eventsTo.getTime();
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      start_at: e.start_at,
      subtitle: [formatEventTime(e.start_at), e.location, e.creators?.full_name]
        .filter(Boolean)
        .join(" · "),
      creatorId: e.creator_id,
      creators: e.creators,
    }));

  const deadlineRows: TermineRow[] = (deadlinesData?.deadlines ?? [])
    .filter((d) => new Date(`${d.deadline}T00:00:00`).getTime() <= deadlineCutoff.getTime())
    .map((d) => ({
      id: `deal-${d.id}`,
      title: d.title,
      type: "deadline",
      start_at: `${d.deadline}T00:00:00`,
      subtitle: [d.brands?.company_name, d.creators?.full_name].filter(Boolean).join(" · "),
      creatorId: d.creator_id,
      creators: d.creators,
    }));

  const todoRows: TermineRow[] = (todosData?.todos ?? [])
    .filter(
      (t) => !t.done && t.due_date && new Date(`${t.due_date}T00:00:00`).getTime() <= deadlineCutoff.getTime(),
    )
    .map((t) => ({
      id: `todo-${t.id}`,
      title: t.title,
      type: "todo",
      start_at: `${t.due_date}T00:00:00`,
      subtitle: [t.priority ? PRIORITY_LABEL[t.priority] : null, t.assignee?.full_name]
        .filter(Boolean)
        .join(" · "),
      creatorId: t.assignee?.id ?? null,
      creators: t.assignee,
    }));

  // Closer to "now" (overdue or upcoming) ranks higher, regardless of direction.
  const events = [...eventRows, ...deadlineRows, ...todoRows].sort(
    (a, b) =>
      Math.abs(new Date(a.start_at).getTime() - now.getTime()) -
      Math.abs(new Date(b.start_at).getTime() - now.getTime()),
  );

  const isPending = eventsPending || deadlinesPending || todosPending;

  return (
    <Card className={cn("p-5 flex flex-col gap-4 h-full", className)}>
      {/* Header */}
      <div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
          {Object.entries(TYPE_DOT).map(([type, dot]) => (
            <span key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("w-2 h-2 rounded-full", dot)} />
              {TYPE_LABEL[type]}
            </span>
          ))}
        </div>

        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Anstehende Termine · nächste 7 Tage
        </p>
      </div>

      {/* Event list */}
      <div className="flex flex-col divide-y divide-border overflow-y-auto max-h-80">
        {isPending ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Keine anstehenden Termine.</p>
        ) : (
          events.map((ev) => {
            const d = new Date(ev.start_at);
            const overdue = d.getTime() < now.getTime();
            return (
              <div key={ev.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                {/* Date chip */}
                <div
                  className={cn(
                    "w-12 shrink-0 rounded-xl px-2 py-2 text-center",
                    overdue ? "bg-red-500/10" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "block text-lg font-bold leading-none",
                      overdue ? "text-red-600" : "text-foreground",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <span
                    className={cn(
                      "block text-[10px] font-medium uppercase mt-0.5 leading-none",
                      overdue ? "text-red-600/80" : "text-muted-foreground",
                    )}
                  >
                    {MONTH_SHORT[d.getMonth()]}
                  </span>
                </div>

                {/* Title + subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {ev.title}
                  </p>
                  {ev.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.subtitle}</p>
                  )}
                </div>

                {/* Creator avatar */}
                {ev.creators && (
                  <span title={ev.creators.full_name}>
                    <Avatar initials={ev.creators.initials} size="sm" className="shrink-0" />
                  </span>
                )}

                {/* Reminder */}
                {(ev.type === "deadline" || ev.type === "todo") && ev.creatorId && (
                  <ReminderDialog
                    creatorId={ev.creatorId}
                    creatorName={ev.creators?.full_name ?? "Creator"}
                    defaultMessage={buildReminderMessage(ev, overdue)}
                  />
                )}

                {/* Type dot */}
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", TYPE_DOT[ev.type] ?? "bg-gray-400")} />
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
