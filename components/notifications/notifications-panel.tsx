"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell, BellOff, CalendarClock, Check, CheckCheck, CircleDollarSign,
  Clock3, FileCheck2, Inbox, ListTodo, Mail, MoreHorizontal, RotateCcw,
} from "lucide-react";
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar-creator";
import type { Notification, NotificationType } from "@/domains/notifications/types";

export type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

type Tab = "current" | "unread" | "archived";
const QUERY_KEY = QueryKeys.notifications.all();

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  BRAND_REPLIED: Mail,
  OFFER_ACCEPTED: Check,
  OFFER_REJECTED: Inbox,
  OFFER_COUNTERED: Mail,
  APPROVAL_GRANTED: FileCheck2,
  APPROVAL_REJECTED: FileCheck2,
  CONTENT_DELIVERED: FileCheck2,
  PAYMENT_RECEIVED: CircleDollarSign,
  NEW_REQUEST_DETECTED: Inbox,
  REQUEST_STALE: Clock3,
  OFFER_STALE: Clock3,
  DRAFT_DUE_SOON: CalendarClock,
  DRAFT_OVERDUE: CalendarClock,
  INVOICE_DUE_SOON: CircleDollarSign,
  INVOICE_OVERDUE: CircleDollarSign,
  PAYOUT_PENDING: CircleDollarSign,
};

const TYPE_TINT: Record<NotificationType, string> = {
  BRAND_REPLIED: "bg-blue-500 text-white",
  OFFER_ACCEPTED: "bg-emerald-500 text-white",
  OFFER_REJECTED: "bg-rose-500 text-white",
  OFFER_COUNTERED: "bg-amber-500 text-white",
  APPROVAL_GRANTED: "bg-emerald-500 text-white",
  APPROVAL_REJECTED: "bg-rose-500 text-white",
  CONTENT_DELIVERED: "bg-sky-500 text-white",
  PAYMENT_RECEIVED: "bg-emerald-500 text-white",
  NEW_REQUEST_DETECTED: "bg-primary text-primary-foreground",
  REQUEST_STALE: "bg-amber-500 text-white",
  OFFER_STALE: "bg-amber-500 text-white",
  DRAFT_DUE_SOON: "bg-amber-500 text-white",
  DRAFT_OVERDUE: "bg-rose-500 text-white",
  INVOICE_DUE_SOON: "bg-amber-500 text-white",
  INVOICE_OVERDUE: "bg-rose-500 text-white",
  PAYOUT_PENDING: "bg-rose-500 text-white",
};

function relativeTime(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
}

async function patchNotification(id: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Benachrichtigung konnte nicht aktualisiert werden");
}

export function NotificationsPanel({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("current");
  const { data, isPending } = useQuery<NotificationsResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => fetch("/api/notifications").then((response) => response.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const notifications = useMemo(() => data?.notifications ?? [], [data]);
  const current = notifications.filter((item) => item.status === "OPEN");
  const unread = current.filter((item) => !item.read_at);
  const archived = notifications.filter((item) => item.status !== "OPEN");
  const items = tab === "unread" ? unread : tab === "archived" ? archived : current;

  async function refresh(action: () => Promise<void>) {
    await action();
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  async function markAllRead() {
    await refresh(async () => {
      const response = await fetch("/api/notifications/read", { method: "POST" });
      if (!response.ok) throw new Error("Benachrichtigungen konnten nicht gelesen werden");
    });
  }

  async function convertToTodo(id: string) {
    await refresh(async () => {
      const response = await fetch(`/api/notifications/${id}/to-todo`, { method: "POST" });
      if (!response.ok) throw new Error("To-do konnte nicht erstellt werden");
    });
    await queryClient.invalidateQueries({ queryKey: QueryKeys.todos.all() });
  }

  async function mute(item: Notification, scopeType: "VORGANG" | "CREATOR") {
    const scopeKey = scopeType === "VORGANG" ? item.vorgang_key : `creator:${item.creator_id}`;
    await refresh(async () => {
      await fetch("/api/notifications/mutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeType, scopeKey }),
      });
      await patchNotification(item.id, { action: "dismiss" });
    });
  }

  async function openItem(item: Notification) {
    if (!item.read_at) await patchNotification(item.id, { action: "read", unread: false });
    if (item.href) {
      onNavigate?.();
      router.push(item.href);
    }
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "current", label: "Aktuell" },
    { id: "unread", label: "Ungelesen", count: unread.length },
    { id: "archived", label: "Archiv" },
  ];

  return (
    <section className="w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-popover text-popover-foreground">
      <header className="flex items-center justify-between px-4 pb-1 pt-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Benachrichtigungen</h2>
          <p className="text-xs text-muted-foreground">
            {unread.length === 0 ? "Alles auf dem neuesten Stand" : `${unread.length} ungelesen`}
          </p>
        </div>
        <Button type="button" variant="ghost" disabled={unread.length === 0} onClick={() => void markAllRead()} className="h-8 gap-1.5 px-2 text-xs text-muted-foreground">
          <CheckCheck className="size-3.5" />
          Alle gelesen
        </Button>
      </header>

      <nav className="mt-2 flex border-b border-border px-3" aria-label="Benachrichtigungsfilter">
        {tabs.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn("relative flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors", tab === item.id && "text-foreground")}>
            {item.label}
            {!!item.count && <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">{item.count}</span>}
            {tab === item.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </nav>

      <div className="max-h-[430px] overflow-y-auto">
        {isPending ? (
          <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Bell className="size-4" /></span>
            <p className="mt-3 text-sm font-medium">{tab === "archived" ? "Noch nichts archiviert" : "Alles erledigt"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Neue Aktivitäten erscheinen automatisch hier.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const Icon = TYPE_ICON[item.type];
              const isUnread = !item.read_at && item.status === "OPEN";
              const actor = item.creator?.full_name ?? "TalentOS";
              return (
                <li key={item.id} className={cn("group flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50", isUnread && "bg-primary/[0.035]")}>
                  <div className="relative mt-0.5 size-8 shrink-0">
                    {item.creator ? <Avatar initials={item.creator.initials} avatarConfig={item.creator.avatar_config} name={item.creator.full_name} variant="team" className="size-8 text-[10px]" /> : <span className="grid size-8 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">TO</span>}
                    <span className={cn("absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full ring-2 ring-popover", TYPE_TINT[item.type])}><Icon className="size-2.5" /></span>
                  </div>

                  <button type="button" onClick={() => void openItem(item)} className="min-w-0 flex-1 text-left">
                    <p className="text-[13px] leading-snug text-muted-foreground"><span className="font-medium text-foreground">{actor}</span>{" "}<span className={cn(isUnread && "font-medium text-foreground")}>{item.title}</span></p>
                    {item.reason && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground/75">
                      <span>{relativeTime(item.updated_at)}</span>
                      {item.reminder_count > 0 && <span className="rounded-full bg-muted px-1.5 py-0.5">{item.reminder_count + 1} Erinnerungen</span>}
                      {item.acknowledged_at && <span className="text-primary">Bestätigt</span>}
                    </div>
                  </button>

                  <div className="flex shrink-0 items-start gap-1">
                    {isUnread && <span className="mt-2.5 size-2 rounded-full bg-primary" aria-label="Ungelesen" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Weitere Aktionen"><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52!">
                        {item.status === "OPEN" ? (
                          <>
                            <DropdownMenuItem onClick={() => void refresh(() => patchNotification(item.id, { action: "read", unread: !isUnread }))}><Check className="size-3.5" />{isUnread ? "Als gelesen markieren" : "Als ungelesen markieren"}</DropdownMenuItem>
                            {item.is_condition && (
                              <>
                                <DropdownMenuItem onClick={() => void refresh(() => patchNotification(item.id, { action: "acknowledge" }))}><CheckCheck className="size-3.5" />Zur Kenntnis genommen</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void refresh(() => patchNotification(item.id, { action: "snooze", until: new Date(Date.now() + 86_400_000).toISOString() }))}><Clock3 className="size-3.5" />Morgen erinnern</DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => void convertToTodo(item.id)}><ListTodo className="size-3.5" />In To-do verwandeln</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void refresh(() => patchNotification(item.id, { action: "dismiss" }))}><Inbox className="size-3.5" />Archivieren</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void mute(item, "VORGANG")}><BellOff className="size-3.5" />{item.is_condition ? "Diese Erinnerung stummschalten" : "Vorgang stummschalten"}</DropdownMenuItem>
                            {item.creator && <DropdownMenuItem onClick={() => void mute(item, "CREATOR")}><BellOff className="size-3.5" />{item.creator.full_name} stummschalten</DropdownMenuItem>}
                          </>
                        ) : item.status === "DISMISSED" ? (
                          <DropdownMenuItem onClick={() => void refresh(() => patchNotification(item.id, { action: "restore" }))}><RotateCcw className="size-3.5" />Wiederherstellen</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled><ListTodo className="size-3.5" />Als To-do gespeichert</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
