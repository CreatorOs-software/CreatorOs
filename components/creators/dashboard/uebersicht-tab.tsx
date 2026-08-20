"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DealFull, Invoice } from "./types";
import { fmtMoney } from "./constants";
import type { Creator } from "@/domains/creators/types";
import { QueryKeys } from "@/lib/query-keys";

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
  assignee: { id: string; full_name: string; initials: string; color: string } | null;
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
};

const TYPE_LABEL: Record<string, string> = {
  shoot: "Shoot", travel: "Travel", deadline: "Deadline",
  posting: "Posting", brand: "Brand", internal: "Intern",
};

const MONTH_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

// ─── Seed events (relative to current week) ───────────────────────────────────

function getSeedEvents(): (CalendarEvent & { subtitle: string })[] {
  const monday = (() => {
    const now = new Date();
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const d = new Date(now);
    d.setDate(now.getDate() - dow);
    d.setHours(9, 0, 0, 0);
    return d;
  })();

  function dayOf(offset: number, h: number, m: number) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  return [
    { id: "s1", title: "Shooting Sommerkampagne", type: "shoot",    start_at: dayOf(0, 9, 0),  location: "Studio Nord",  subtitle: "L'Oréal Paris · 09:00 · Studio Nord" },
    { id: "s2", title: "Teaser-Reel geht live",   type: "posting",  start_at: dayOf(1, 17, 0), location: null,           subtitle: "Garnier · 17:00" },
    { id: "s3", title: "Brand Call Zalando",       type: "brand",    start_at: dayOf(2, 14, 30),location: "Google Meet",  subtitle: "14:30 · Google Meet" },
    { id: "s4", title: "Anreise München",          type: "travel",   start_at: dayOf(3, 8, 0),  location: null,           subtitle: "Booking · Travel Feature" },
    { id: "s5", title: "Moodboard-Abgabe",         type: "deadline", start_at: dayOf(4, 12, 0), location: null,           subtitle: "Zalando Herbstkollektion" },
  ];
}

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

// ─── Termine Card ─────────────────────────────────────────────────────────────

function TermineCard({ creatorId }: { creatorId: string }) {
  const now = new Date();
  const start = startOfWeekMonday();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const { data } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [...QueryKeys.events.range(start.toISOString(), end.toISOString()), creatorId],
    queryFn: () => {
      const params = new URLSearchParams({
        from: start.toISOString(),
        to: end.toISOString(),
        creator_id: creatorId,
      });
      return fetch(`/api/events?${params}`).then((r) => r.json());
    },
    staleTime: 5 * 60_000,
  });

  const seeds = getSeedEvents();
  const apiEvents: (CalendarEvent & { subtitle?: string })[] = (data?.events ?? [])
    .filter((e) => isThisWeekDate(new Date(e.start_at)))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .map((e) => ({
      ...e,
      subtitle: [formatEventTime(e.start_at), e.location].filter(Boolean).join(" · "),
    }));

  const events = apiEvents.length > 0 ? apiEvents : seeds;

  const monthLabel = now.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

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
          Anstehende Termine · {monthLabel}
        </p>
      </div>

      {/* Event list */}
      <div className="flex flex-col divide-y divide-border">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Keine Termine diese Woche.</p>
        ) : (
          events.map((ev) => {
            const d = new Date(ev.start_at);
            return (
              <div key={ev.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                {/* Date chip */}
                <div className="w-12 shrink-0 rounded-xl bg-muted px-2 py-2 text-center">
                  <span className="block text-lg font-bold text-foreground leading-none">
                    {d.getDate()}
                  </span>
                  <span className="block text-[10px] font-medium text-muted-foreground uppercase mt-0.5 leading-none">
                    {MONTH_SHORT[d.getMonth()]}
                  </span>
                </div>

                {/* Title + subtitle */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{ev.title}</p>
                  {ev.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.subtitle}</p>
                  )}
                </div>

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
          <button
            onClick={() => setSelected(null)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-3.5" />
          </button>
          <span className="text-sm font-semibold">Detail</span>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          {/* Checkbox + title */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => toggleTodo(selected)}
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all duration-150",
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
            </button>
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
                  <span
                    className="inline-flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: selected.assignee.color }}
                  >
                    {selected.assignee.initials}
                  </span>
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
                <button
                  onClick={(e) => { e.stopPropagation(); toggleTodo(todo); }}
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-all duration-150",
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
                </button>

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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Row 1: Termine + Todos — grid so both cells are equal height */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 18rem" }}>
        <TermineCard creatorId={creatorId} />
        <TodosWidget creatorId={creatorId} />
      </div>

      {/* Row 2: Revenue */}
      <RevenueSection invoices={invoices} creator={creator} />

      {/* Row 3: Ziele */}
      <ZieleSection creator={creator} deals={deals} />
    </div>
  );
}
