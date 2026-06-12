"use client";

import { QueryKeys } from "@/lib/query-keys";
import { useQueries, UseQueryOptions } from "@tanstack/react-query";

const PREFETCH_QUERIES: UseQueryOptions[] = [
  {
    queryKey: QueryKeys.inbox.all(),
    queryFn: () => fetch("/api/inbox").then((r) => r.json()),
    staleTime: 5 * 60_000,
  },
  {
    queryKey: QueryKeys.creators.list(),
    queryFn: () => fetch("/api/creators/list").then((r) => r.json()),
    staleTime: 5 * 60_000,
  },
];

export function Prefetch() {
  useQueries({ queries: PREFETCH_QUERIES });

  return null;
}
