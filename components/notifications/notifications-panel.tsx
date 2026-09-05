"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, ListTodo, MoreHorizontal, X } from "lucide-react";
import { QueryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { FloatingWindow } from "@/components/ui/floating-window";
import { Avatar } from "@/components/ui/avatar-creator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  Notification,
  NotificationSeverity,
} from "@/domains/notifications/types";

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

const SEVERITY_DOT: Record<NotificationSeverity, string> = {
  LAUT: "bg-red-500",
  NORMAL: "bg-amber-500",
  LEISE: "bg-muted-foreground/40",
};

const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  LAUT: "Laut",
  NORMAL: "Normal",
  LEISE: "Leise",
};

type VolumeFilter = "all" | NotificationSeverity;

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.round(h / 24);
  return `vor ${d} T`;
}

const QUERY_KEY = QueryKeys.notifications.all();

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [volume, setVolume] = useState<VolumeFilter>("all");

  const { data, isPending } = useQuery<NotificationsResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const items = useMemo(() => {
    const all = data?.notifications ?? [];
    return volume === "all" ? all : all.filter((n) => n.severity === volume);
  }, [data, volume]);

  function removeFromCache(id: string): NotificationsResponse | undefined {
    const previous = queryClient.getQueryData<NotificationsResponse>(QUERY_KEY);
    queryClient.setQueryData<NotificationsResponse>(QUERY_KEY, (old) =>
      old
        ? {
            notifications: old.notifications.filter((n) => n.id !== id),
            unreadCount: old.notifications.filter(
              (n) => n.id !== id && !n.read_at,
            ).length,
          }
        : old,
    );
    return previous;
  }

  async function dismiss(id: string) {
    const previous = removeFromCache(id);
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISMISSED" }),
    });
    if (!res.ok && previous) queryClient.setQueryData(QUERY_KEY, previous);
  }

  async function convertToTodo(id: string) {
    const previous = removeFromCache(id);
    const res = await fetch(`/api/notifications/${id}/to-todo`, { method: "POST" });
    if (!res.ok && previous) {
      queryClient.setQueryData(QUERY_KEY, previous);
      return;
    }
    queryClient.invalidateQueries({ queryKey: QueryKeys.todos.all() });
  }

  async function mute(n: Notification, scopeType: "VORGANG" | "CREATOR") {
    const scopeKey =
      scopeType === "VORGANG" ? n.vorgang_key : `creator:${n.creator_id}`;
    removeFromCache(n.id);
    await fetch("/api/notifications/mutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scopeType, scopeKey }),
    });
    await fetch(`/api/notifications/${n.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISMISSED" }),
    });
  }

  function openTarget(n: Notification) {
    if (n.href) router.push(n.href);
  }

  return (
    <>
      <FloatingWindow.Header title="Benachrichtigungen" className="border-b-0" />

      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-muted/60 px-3 py-1.5">
        {(["all", "LAUT", "NORMAL", "LEISE"] as VolumeFilter[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVolume(v)}
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
              volume === v
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {v === "all" ? "Alle" : SEVERITY_LABEL[v]}
          </button>
        ))}
      </div>

      <FloatingWindow.Body className="p-0">
        <div className="h-full overflow-auto">
          {isPending ? (
            <p className="p-4 text-sm text-muted-foreground">Lade…</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Keine neuen Benachrichtigungen.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="group flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      SEVERITY_DOT[n.severity],
                    )}
                    aria-hidden
                  />

                  <button
                    type="button"
                    onClick={() => openTarget(n)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      {n.creator && (
                        <Avatar
                          initials={n.creator.initials}
                          variant="team"
                          className="size-4 text-[9px]"
                        />
                      )}
                      {n.creator && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {n.creator.full_name}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatRelative(n.created_at)}
                      </span>
                    </span>
                    <span className="text-sm text-foreground">{n.title}</span>
                    {n.reason && (
                      <span className="text-xs text-muted-foreground">
                        {n.reason}
                      </span>
                    )}
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      title="In To-do verwandeln"
                      onClick={() => convertToTodo(n.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ListTodo className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Wegwischen"
                      onClick={() => dismiss(n.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Mehr"
                      >
                        <MoreHorizontal className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => mute(n, "VORGANG")}>
                          <BellOff className="size-3.5" />
                          Vorgang stummschalten
                        </DropdownMenuItem>
                        {n.creator && (
                          <DropdownMenuItem onClick={() => mute(n, "CREATOR")}>
                            <BellOff className="size-3.5" />
                            {n.creator.full_name} stummschalten
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FloatingWindow.Body>
    </>
  );
}
