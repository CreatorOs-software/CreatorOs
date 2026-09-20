"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar-creator";
import { Button, Card, Skeleton } from "@talentos/ui";
import { cn } from "@/lib/utils";
import type { DealFull, Invoice } from "./types";
import { fmtMoney } from "./constants";
import type { Creator } from "@/domains/creators/types";
import { QueryKeys } from "@/lib/query-keys";
import { ReminderDialog } from "@/components/dashboard/reminder-dialog";

// ─── Local types ──────────────────────────────────────────────────────────────

type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  location: string | null;
};

type Priority = "niedrig" | "mittel" | "hoch";

type TodoItem = {
  id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  priority: Priority | null;
  assignee: { id: string; full_name: string; initials: string } | null;
};

const PRIORITY_CFG: Record<Priority, { label: string; dot: string; badge: string }> = {
  niedrig: { label: "Niedrig", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  mittel:  { label: "Mittel",  dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700"   },
  hoch:    { label: "Hoch",    dot: "bg-red-500",      badge: "bg-red-100 text-red-700"       },
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

const MONTH_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday() {
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const d = new Date(now);
  d.setDate(now.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isThisWeekDate(date: Date) {
  const start = startOfWeekMonday();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return date >= start && date <= end;
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatTodoDate(isoDate: string | null) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  const today = todayMidnight();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(d, today)) return "Heute";
  if (isSameDay(d, tomorrow)) return "Morgen";
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

function isTodayStr(iso: string | null) {
  if (!iso) return false;
  return isSameDay(new Date(iso + "T00:00:00"), todayMidnight());
}

function isTomorrowStr(iso: string | null) {
  if (!iso) return false;
  const tom = new Date(todayMidnight());
  tom.setDate(tom.getDate() + 1);
  return isSameDay(new Date(iso + "T00:00:00"), tom);
}

function isThisWeekStr(iso: string | null) {
  if (!iso) return false;
  return isThisWeekDate(new Date(iso + "T00:00:00"));
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function buildReminderMessage(
  row: { title: string; type: string; start_at: string },
  creatorName: string,
  overdue: boolean,
): string {
  const name = creatorName.split(" ")[0] || "hey";
  const date = new Date(row.start_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const when = overdue ? `war am ${date} fällig` : `ist am ${date} fällig`;
  const what = row.type === "todo" ? "dein To-do" : "die Deadline für";
  return `Hey ${name}, kurze Erinnerung: ${what} „${row.title}“ ${when}. Kannst du kurz Bescheid geben, wie der Stand ist?`;
}

// ─── Termine Card ─────────────────────────────────────────────────────────────

const EVENTS_WINDOW_DAYS = 7;
const DEADLINE_WINDOW_DAYS = 3;

function TermineCard({
  creatorId,
  creatorName,
  deals,
}: {
  creatorId: string;
  creatorName: string;
  deals: DealFull[];
}) {
  // Frozen for the component's lifetime — a fresh `new Date()` on every render
  // would change the query keys below on every render and cause a refetch loop.
  const now = useMemo(() => new Date(), []);
  const eventsTo = useMemo(() => addDays(now, EVENTS_WINDOW_DAYS), [now]);
  const deadlineCutoff = useMemo(() => addDays(now, DEADLINE_WINDOW_DAYS), [now]);

  const { data, isPending } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [...QueryKeys.events.range(now.toISOString(), eventsTo.toISOString()), creatorId],
    queryFn: () => {
      const params = new URLSearchParams({
        from: now.toISOString(),
        to: eventsTo.toISOString(),
        creator_id: creatorId,
      });
      return fetch(`/api/events?${params}`).then((r) => r.json());
    },
    staleTime: 5 * 60_000,
  });

  const { data: todosData } = useQuery<{ todos: TodoItem[] }>({
    queryKey: QueryKeys.todos.all(),
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
    staleTime: 60_000,
  });

  const apiEvents: (CalendarEvent & { subtitle?: string })[] = (data?.events ?? [])
    .filter((e) => {
      const t = new Date(e.start_at).getTime();
      return t >= now.getTime() && t <= eventsTo.getTime();
    })
    .map((e) => ({
      ...e,
      subtitle: [formatEventTime(e.start_at), e.location].filter(Boolean).join(" · "),
    }));

  const dealDeadlines: (CalendarEvent & { subtitle?: string })[] = deals
    .filter((d) => d.deadline && new Date(`${d.deadline}T00:00:00`).getTime() <= deadlineCutoff.getTime())
    .map((d) => ({
      id: `deal-${d.id}`,
      title: d.title,
      type: "deadline",
      start_at: `${d.deadline}T00:00:00`,
      location: null,
      subtitle: d.brands?.company_name,
    }));

  const todoItems: (CalendarEvent & { subtitle?: string })[] = (todosData?.todos ?? [])
    .filter(
      (t) =>
        !t.done &&
        t.assignee?.id === creatorId &&
        t.due_date &&
        new Date(`${t.due_date}T00:00:00`).getTime() <= deadlineCutoff.getTime(),
    )
    .map((t) => ({
      id: `todo-${t.id}`,
      title: t.title,
      type: "todo",
      start_at: `${t.due_date}T00:00:00`,
      location: null,
      subtitle: t.priority ? PRIORITY_CFG[t.priority].label : undefined,
    }));

  // Closer to "now" (overdue or upcoming) ranks higher, regardless of direction.
  const events = [...apiEvents, ...dealDeadlines, ...todoItems].sort(
    (a, b) =>
      Math.abs(new Date(a.start_at).getTime() - now.getTime()) -
      Math.abs(new Date(b.start_at).getTime() - now.getTime()),
  );

  return (
    <Card className="p-5 flex flex-col gap-4 h-full">
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
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{ev.title}</p>
                  {ev.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.subtitle}</p>
                  )}
                </div>

                {/* Reminder */}
                {(ev.type === "deadline" || ev.type === "todo") && (
                  <ReminderDialog
                    creatorId={creatorId}
                    creatorName={creatorName}
                    defaultMessage={buildReminderMessage(ev, creatorName, overdue)}
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

// ─── Todos Widget ─────────────────────────────────────────────────────────────

function TodosWidget({ creatorId }: { creatorId: string }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<TodoItem | null>(null);

  const { data } = useQuery<{ todos: TodoItem[] }>({
    queryKey: QueryKeys.todos.all(),
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  const myTodos = (data?.todos ?? []).filter((t) => t.assignee?.id === creatorId);
  const openTodos = myTodos.filter((t) => !t.done);
  const todayCount = openTodos.filter((t) => isTodayStr(t.due_date)).length;
  const weekCount = openTodos.filter((t) => isThisWeekStr(t.due_date)).length;

  async function toggleTodo(todo: TodoItem) {
    // Optimistic update
    queryClient.setQueryData<{ todos: TodoItem[] }>(QueryKeys.todos.all(), (old) => ({
      todos: (old?.todos ?? []).map((t) =>
        t.id === todo.id ? { ...t, done: !t.done } : t,
      ),
    }));
    if (selected?.id === todo.id) setSelected((s) => s ? { ...s, done: !s.done } : s);

    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    if (!res.ok) {
      // Revert on failure
      queryClient.setQueryData<{ todos: TodoItem[] }>(QueryKeys.todos.all(), (old) => ({
        todos: (old?.todos ?? []).map((t) =>
          t.id === todo.id ? { ...t, done: todo.done } : t,
        ),
      }));
    }
  }

  // ── Detail view ───────────────────────────────────────────────────────────

  if (selected) {
    const pCfg = selected.priority ? PRIORITY_CFG[selected.priority] : null;
    return (
      <Card className="p-5 flex flex-col gap-4 w-72 shrink-0 h-full">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSelected(null)}
            className="size-7 rounded-md text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-3.5" />
          </Button>
          <span className="text-sm font-semibold">Detail</span>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          {/* Checkbox + title */}
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => toggleTodo(selected)}
              className={cn(
                "mt-0.5 size-5 shrink-0 rounded-md border transition-all duration-150 hover:bg-transparent",
                selected.done
                  ? "border-foreground bg-foreground"
                  : "border-border bg-background",
              )}
            >
              {selected.done && (
                <svg className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 12 9">
                  <path d="M1 4.2L4 7L11 1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </Button>
            <p className={cn("text-sm font-semibold leading-snug", selected.done && "line-through text-muted-foreground")}>
              {selected.title}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Meta */}
          <div className="flex flex-col gap-3">
            {pCfg && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Priorität</span>
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5", pCfg.badge)}>
                  <span className={cn("size-1.5 rounded-full", pCfg.dot)} />
                  {pCfg.label}
                </span>
              </div>
            )}

            {selected.due_date && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Fällig am
                </span>
                <span className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full",
                  isTodayStr(selected.due_date) ? "bg-red-500/10 text-red-600" :
                  isTomorrowStr(selected.due_date) ? "bg-orange-400/10 text-orange-600" :
                  "bg-muted text-muted-foreground",
                )}>
                  {formatTodoDate(selected.due_date)}
                </span>
              </div>
            )}

            {selected.assignee && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5" /> Zugewiesen
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Avatar
                    initials={selected.assignee.initials}
                    variant="team"
                    className="size-5 text-[9px]"
                  />
                  {selected.assignee.full_name}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────

  return (
    <Card className="p-5 flex flex-col gap-4 w-72 shrink-0 h-full">
      <h3 className="text-sm font-semibold">To-dos</h3>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/60 p-3 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Heute</p>
          <p className="text-3xl font-light tabular-nums">{todayCount}</p>
        </div>
        <div className="rounded-xl bg-muted/60 p-3 text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Diese Woche</p>
          <p className="text-3xl font-light tabular-nums">{weekCount}</p>
        </div>
      </div>

      {/* Todo list */}
      <div className="flex flex-col gap-1 overflow-y-auto flex-1">
        {openTodos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine offenen Todos zugewiesen.</p>
        ) : (
          openTodos.map((todo) => {
            const label = formatTodoDate(todo.due_date);
            const isToday = isTodayStr(todo.due_date);
            const isTomorrow = isTomorrowStr(todo.due_date);
            const pCfg = todo.priority ? PRIORITY_CFG[todo.priority] : null;
            return (
              <div
                key={todo.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors cursor-pointer group"
                onClick={() => setSelected(todo)}
              >
                {/* Checkbox */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); toggleTodo(todo); }}
                  className={cn(
                    "size-4 shrink-0 rounded border transition-all duration-150 hover:bg-transparent",
                    todo.done
                      ? "border-foreground bg-foreground"
                      : "border-border bg-background",
                  )}
                >
                  {todo.done && (
                    <svg className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 12 9">
                      <path d="M1 4.2L4 7L11 1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </Button>

                {/* Priority dot */}
                {pCfg && <span className={cn("size-1.5 rounded-full shrink-0", pCfg.dot)} />}

                <span className={cn(
                  "flex-1 text-xs truncate",
                  todo.done ? "line-through text-muted-foreground" : "text-foreground",
                )}>
                  {todo.title}
                </span>

                {label && (
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap",
                    isToday ? "bg-red-500/10 text-red-600" :
                    isTomorrow ? "bg-orange-400/10 text-orange-600" :
                    "bg-muted text-muted-foreground",
                  )}>
                    {label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ─── Revenue + Jahresziel ────────────────────────────────────────────────────

function RevenueSection({
  invoices,
  creator,
}: {
  invoices: Invoice[];
  creator: Creator | null;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const mtd = invoices
    .filter((inv) => inv.status === "paid" && inv.paid_at &&
      new Date(inv.paid_at).getMonth() === month &&
      new Date(inv.paid_at).getFullYear() === year)
    .reduce((s, inv) => s + inv.amount, 0);

  const ytd = invoices
    .filter((inv) => inv.status === "paid" && inv.paid_at &&
      new Date(inv.paid_at).getFullYear() === year)
    .reduce((s, inv) => s + inv.amount, 0);

  const monthLabel = now.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const goalValue = creator?.goal_value ?? null;
  const isYearGoal = creator?.goal_type === "umsatz";
  const progressPct = isYearGoal && goalValue ? Math.min(100, (ytd / goalValue) * 100) : 0;
  const remaining = goalValue ? Math.max(0, goalValue - ytd) : 0;

  const periodLabel = creator?.goal_period === "1_jahr" ? `Jahresziel ${year}`
    : creator?.goal_period === "3_monate" ? "Quartalsziel"
    : "30-Tage-Ziel";

  return (
    <div className={cn("grid gap-4", isYearGoal && goalValue ? "grid-cols-3" : "grid-cols-2")}>
      <Card className="p-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Umsatz · Diesen Monat</p>
        <p className="mt-2 text-2xl font-light tabular-nums">{fmtMoney(mtd)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{monthLabel}</p>
      </Card>

      <Card className="p-5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Umsatz · Dieses Jahr</p>
        <p className="mt-2 text-2xl font-light tabular-nums">{fmtMoney(ytd)}</p>
        <p className="mt-1 text-xs text-muted-foreground">kumuliert {year}</p>
      </Card>

      {isYearGoal && goalValue && (
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold">{periodLabel}</p>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              progressPct >= 100 ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-600",
            )}>
              ● {Math.round(progressPct)} %
            </span>
          </div>
          <p className="mt-3 text-2xl font-light tabular-nums">{fmtMoney(ytd)}</p>
          <p className="mt-1 text-xs text-muted-foreground text-right">Ziel {fmtMoney(goalValue)}</p>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", progressPct >= 100 ? "bg-green-500" : "bg-amber-500")}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {progressPct >= 100 ? "Ziel erreicht!" : `Noch ${fmtMoney(remaining)} bis Jahresende`}
          </p>
        </Card>
      )}
    </div>
  );
}

// ─── Interne Ziele ────────────────────────────────────────────────────────────

function ZieleSection({ creator, deals }: { creator: Creator | null; deals: DealFull[] }) {
  if (!creator) return null;
  const { goal_value, goal_type, weitere_ziele } = creator;

  const hasKoopGoal = goal_type === "kooperationen" && goal_value;
  const hasPostGoal = goal_type === "post" && goal_value;

  if (!hasKoopGoal && !hasPostGoal && !weitere_ziele) return null;

  const doneDeals = deals.filter((d) => ["paid", "posted", "invoiced"].includes(d.status)).length;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Interne Ziele</h3>
      <div className="grid grid-cols-2 gap-4">
        {hasKoopGoal && (
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Kooperationen</span>
              <span className="text-xs text-muted-foreground tabular-nums">{doneDeals} von {goal_value} Deals</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${Math.min(100, (doneDeals / goal_value!) * 100)}%` }}
              />
            </div>
          </Card>
        )}
        {hasPostGoal && (
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Posts</span>
              <span className="text-xs text-muted-foreground">Ziel: {goal_value} Posts</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-blue-500" style={{ width: "0%" }} />
            </div>
          </Card>
        )}
        {weitere_ziele && (
          <Card className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Weitere Ziele</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{weitere_ziele}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function UebersichtTab({
  creatorId,
  deals,
  invoices,
  creator,
  isPending,
}: {
  creatorId: string;
  deals: DealFull[];
  invoices: Invoice[];
  creator: Creator | null;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-4 pb-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 18rem" }}>
          <Card className="p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </Card>
          <Card className="p-5 flex flex-col gap-3">
            <Skeleton className="h-4 w-16" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full rounded-md" />
            ))}
          </Card>
        </div>
        <Card className="p-5 flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Row 1: Termine + Todos — grid so both cells are equal height */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 18rem" }}>
        <TermineCard creatorId={creatorId} creatorName={creator?.full_name ?? "Creator"} deals={deals} />
        <TodosWidget creatorId={creatorId} />
      </div>

      {/* Row 2: Revenue */}
      <RevenueSection invoices={invoices} creator={creator} />

      {/* Row 3: Ziele */}
      <ZieleSection creator={creator} deals={deals} />
    </div>
  );
}
