"use client";

import { QueryKeys } from "@/lib/query-keys";
import { useQueries, UseQueryOptions } from "@tanstack/react-query";

const PREFETCH_QUERIES: UseQueryOptions[] = [
  // Nur der schlanke Ungelesen-Zähler fürs Sidebar-Badge. Der vollständige
  // Inbox-Payload (`/api/inbox`) wird erst auf der Inbox-Seite selbst geladen.
  {
    queryKey: QueryKeys.inbox.unreadCount(),
    queryFn: () => fetch("/api/inbox/unread-count").then((r) => r.json()),
    staleTime: 60_000,
  },
  {
    queryKey: QueryKeys.creators.list(),
    queryFn: () => fetch("/api/creators/list").then((r) => r.json()),
    staleTime: 5 * 60_000,
  },
  {
    queryKey: QueryKeys.notifications.all(),
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    staleTime: 30_000,
  },
];

export function Prefetch() {
  useQueries({ queries: PREFETCH_QUERIES });

  return null;
}
