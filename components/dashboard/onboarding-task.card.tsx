"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Checkbox,
  Skeleton,
} from "@talentos/ui";
import { Avatar } from "@/components/ui/avatar-creator";
import type { Todo } from "@/domains/todos";

interface OnboardingTaskCardProps {
  className?: string;
}

const WINDOW_DAYS = 3;
const PRIORITY_DOT: Record<string, string> = {
  hoch: "bg-red-400",
  mittel: "bg-amber-400",
  niedrig: "bg-emerald-400",
};

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function formatDueDate(dueDate: string, overdue: boolean) {
  const label = new Date(`${dueDate}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
  return overdue ? `${label} · überfällig` : label;
}

export function OnboardingTaskCard({ className }: OnboardingTaskCardProps) {
  const queryClient = useQueryClient();
  // Frozen for the component's lifetime — a fresh `new Date()` on every
  // render would shift the cutoff and jitter the list.
  const now = useMemo(() => new Date(), []);
  const cutoff = useMemo(() => addDays(now, WINDOW_DAYS), [now]);

  const { data, isPending } = useQuery<{ todos: Todo[] }>({
    queryKey: QueryKeys.todos.all(),
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
    staleTime: 60_000,
  });
  const allTodos = data?.todos ?? [];

  // Nächste 3 Tage, plus überfällige Todos die noch nicht abgehakt sind.
  const tasks = allTodos
    .filter(
      (t) =>
        !t.done &&
        t.due_date &&
        new Date(`${t.due_date}T00:00:00`).getTime() <= cutoff.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime(),
    );

  async function toggleDone(todo: Todo) {
    queryClient.setQueryData<{ todos: Todo[] }>(
      QueryKeys.todos.all(),
      (old) => ({
        todos: (old?.todos ?? []).map((t) =>
          t.id === todo.id ? { ...t, done: true } : t,
        ),
      }),
    );
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    if (!res.ok) {
      queryClient.setQueryData<{ todos: Todo[] }>(
        QueryKeys.todos.all(),
        (old) => ({
          todos: (old?.todos ?? []).map((t) =>
            t.id === todo.id ? { ...t, done: false } : t,
          ),
        }),
      );
    }
  }

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col gap-0 overflow-hidden rounded-2xl bg-card p-5",
        className,
      )}
    >
      <CardHeader className="flex items-start justify-between p-0 mb-6 gap-0">
        <CardTitle className="text-lg font-semibold text-card-foreground">
          Zu erledigen
        </CardTitle>
        <span className="text-sm font-bold text-primary">{tasks.length}</span>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl bg-card-dark-foreground/10" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32 bg-card-dark-foreground/10" />
                  <Skeleton className="h-3 w-20 bg-card-dark-foreground/10" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-4 text-sm text-card-dark-foreground/60">
            Keine offenen Todos für die nächsten {WINDOW_DAYS} Tage.
          </p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const overdue =
                new Date(`${task.due_date}T00:00:00`).getTime() < now.getTime();
              return (
                <div key={task.id} className="flex items-center gap-3 py-2">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleDone(task)}
                    aria-label="Als erledigt markieren"
                    className="shrink-0 rounded-md border-card-dark-foreground/30 data-[state=checked]:border-chart-green data-[state=checked]:bg-chart-green"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          task.priority
                            ? PRIORITY_DOT[task.priority]
                            : "bg-card-dark-foreground/30",
                        )}
                      />
                      <span className="truncate">{task.title}</span>
                    </p>
                    <p
                      className={cn(
                        "pl-3.5 text-xs",
                        overdue
                          ? "text-red-300"
                          : "text-card-dark-foreground/60",
                      )}
                    >
                      {formatDueDate(task.due_date!, overdue)}
                    </p>
                  </div>
                  {task.assignee && (
                    <Avatar
                      initials={task.assignee.initials}
                      avatarConfig={task.assignee.avatar_config}
                      name={task.assignee.full_name}
                      variant="team"
                      className="h-6 w-6 shrink-0 text-[10px]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
