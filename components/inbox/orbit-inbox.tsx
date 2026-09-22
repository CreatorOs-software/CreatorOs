"use client";

import { ChevronLeft, Inbox, RefreshCcw, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { WorkPanel } from "./workpanel/work-panel";
import { OrbitInboxSkeleton } from "./orbit-inbox-skeleton";
import { InboxSidebar } from "./inbox-sidebar";
import { CategorySelect } from "./category-select";
import { ThreadItem } from "./thread-item";
import { EmailDetailPanel, EmptyState } from "./email-detail-panel";
import { ComposeEmailDialog } from "./compose-email-dialog";

import type { Folder, InboxData, Thread, ThreadPatch } from "./types";
import type { WorkPanelState } from "./workpanel/types";
import { QueryKeys } from "@/lib/query-keys";
import {
  Button,
  Input,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@talentos/ui";
import { cn } from "@/lib/utils";

// ─── Work panel resize ────────────────────────────────────────────────────────

const WORK_PANEL_MIN = 300;
const WORK_PANEL_MAX = 720;
const WORK_PANEL_DEFAULT = 340;
const INBOX_MIN = 520; // keep the inbox card at least this wide while dragging
const WORK_PANEL_WIDTH_KEY = "inbox:workPanelWidth";

function readStoredWorkPanelWidth(): number {
  const raw = localStorage.getItem(WORK_PANEL_WIDTH_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return WORK_PANEL_DEFAULT;
  return Math.min(WORK_PANEL_MAX, Math.max(WORK_PANEL_MIN, n));
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchInboxData(
  params: URLSearchParams,
  offset = 0,
): Promise<InboxData> {
  const pageParams = offset > 0 ? new URLSearchParams(params) : params;
  if (offset > 0) pageParams.set("offset", String(offset));
  const res = await fetch(`/api/inbox?${pageParams}`);
  if (!res.ok) throw new Error("Failed to load inbox");
  return res.json() as Promise<InboxData>;
}

async function patchThread(id: string, patch: ThreadPatch): Promise<void> {
  const res = await fetch(`/api/inbox/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
}

// Threads liegen bei `useInfiniteQuery` über mehrere Seiten (`pages[]`)
// verteilt — die beiden Helfer patchen konsistent quer über alle Seiten,
// egal auf welcher Seite ("Basis"-Ladung oder per "Mehr laden" nachgeladen)
// der Datensatz gerade liegt.
function patchThreadsInCache(
  queryClient: QueryClient,
  key: readonly unknown[],
  id: string,
  updater: (t: Thread) => Thread,
) {
  queryClient.setQueryData<InfiniteData<InboxData>>(key, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        threads: page.threads.map((t) => (t.id === id ? updater(t) : t)),
      })),
    };
  });
}

function patchIntegrationsInCache(
  queryClient: QueryClient,
  key: readonly unknown[],
  integrationId: string,
  updater: (
    i: InboxData["integrations"][number],
  ) => InboxData["integrations"][number],
) {
  queryClient.setQueryData<InfiniteData<InboxData>>(key, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        integrations: page.integrations.map((i) =>
          i.id === integrationId ? updater(i) : i,
        ),
      })),
    };
  });
}

// ─── OrbitInbox ───────────────────────────────────────────────────────────────

export function OrbitInbox() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Deeplink aus der Glocke / vom Dashboard: /inbox?thread=<id> überschreibt
  // den zuletzt geöffneten Thread.
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    searchParams.get("thread"),
  );

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<
    string | null
  >(() => searchParams.get("integration_id"));
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [category, setCategory] = useState("all");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [workPanelOpen, setWorkPanelOpen] = useState(true);
  const [workPanelWidth, setWorkPanelWidth] = useState<number>(WORK_PANEL_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startWidth: number;
    max: number;
  } | null>(null);
  const [mergedView, setMergedView] = useState<"sidebar" | "threads">(
    "sidebar",
  );
  const [syncing, setSyncing] = useState(false);

  // Wird gesetzt, sobald ein `?thread=` in der URL steht, und erst wieder
  // gelöscht, wenn dieser Thread tatsächlich in der geladenen Liste gefunden
  // und geöffnet wurde (siehe Effect weiter unten, der auf `threads` lauert).
  const pendingThreadIdRef = useRef<string | null>(null);
  const threadListRef = useRef<HTMLDivElement | null>(null);

  // Client Components werden beim ersten Laden auch serverseitig gerendert.
  // Persistierte Browser-Werte deshalb erst nach der Hydration einlesen; URL-
  // Parameter haben weiterhin Vorrang vor dem zuletzt gespeicherten Zustand.
  useEffect(() => {
    if (storageHydrated) return;
    if (!searchParams.get("thread")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(localStorage.getItem("inbox:selectedThreadId"));
    }
    if (!searchParams.get("integration_id")) {
      setSelectedIntegrationId(localStorage.getItem("inbox:selectedIntegrationId"));
    }
    setWorkPanelWidth(readStoredWorkPanelWidth());
    setStorageHydrated(true);
  }, [searchParams, storageHydrated]);

  // Der Initializer oben greift nur beim allerersten Mount. Navigiert man
  // erneut mit einem anderen `?thread=` hierher, während OrbitInbox schon
  // gemountet ist (z.B. Next behält die Seite im Router-Cache), würde der
  // neue Parameter sonst ignoriert und einfach der zuletzt geöffnete Thread
  // bleibt sichtbar. Deshalb hier zusätzlich reaktiv nachziehen — inklusive
  // `integration_id` (Thread-Liste wird immer nur für EIN Postfach
  // abgefragt) und `mergedView` (im merged Mode zeigt die Inbox standardmäßig
  // nur das Sidebar-Panel — ohne den Wechsel auf "threads" bleibt das
  // Thread-/Detail-Panel unsichtbar). `selectedId` selbst wird hier bewusst
  // NICHT direkt gesetzt: die Thread-Liste für das (evtl. gerade erst
  // gewechselte) Postfach ist an dieser Stelle noch nicht geladen — das
  // würde `selected` kurzzeitig ins Leere laufen lassen. Stattdessen merkt
  // sich `pendingThreadIdRef`, welcher Thread noch geöffnet werden soll.
  useEffect(() => {
    const threadParam = searchParams.get("thread");
    const integrationParam = searchParams.get("integration_id");
    if (threadParam) {
      pendingThreadIdRef.current = threadParam;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMergedView("threads");
    }
    if (integrationParam) {
      setSelectedIntegrationId(integrationParam);
      localStorage.setItem("inbox:selectedIntegrationId", integrationParam);
    }
  }, [searchParams]);
  const [composeOpen, setComposeOpen] = useState(
    () => searchParams.get("compose") === "new",
  );
  const [composeDraft, setComposeDraft] = useState(() => ({
    to: searchParams.get("to") ?? "",
    subject: searchParams.get("subject") ?? "",
    body: searchParams.get("body") ?? "",
  }));
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [workStates, setWorkStates] = useState<Record<string, WorkPanelState>>(
    {},
  );

  useEffect(() => {
    if (searchParams.get("compose") !== "new") return;

    // Deeplink-Daten einmalig in einen lokalen Entwurf übernehmen, bevor
    // die Query-Parameter aus der URL entfernt werden.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setComposeDraft({
      to: searchParams.get("to") ?? "",
      subject: searchParams.get("subject") ?? "",
      body: searchParams.get("body") ?? "",
    });
    setComposeOpen(true);
    router.replace("/inbox", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({
    folder: folder === "bin" ? "TRASH" : folder.toUpperCase(),
  });
  if (selectedIntegrationId)
    params.set("integration_id", selectedIntegrationId);
  if (activeLabelId) params.set("label_id", activeLabelId);
  if (category !== "all") params.set("category", category);
  if (debouncedSearch) params.set("search", debouncedSearch);
  const queryString = params.toString();
  const inboxQueryKey = useMemo(
    () => [...QueryKeys.inbox.list(), queryString] as const,
    [queryString],
  );

  // `useInfiniteQuery` statt `useQuery`: React Query cached selbst alle
  // bereits per "Mehr laden" nachgeladenen Seiten unter demselben Query-Key
  // — verlässt man die Seite und kommt zurück (innerhalb der gcTime), sind
  // die nachgeladenen Threads noch da, ohne dass wir das selbst verwalten
  // müssten.
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: inboxQueryKey,
    queryFn: ({ pageParam }) => fetchInboxData(params, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore
        ? allPages.reduce((sum, p) => sum + p.threads.length, 0)
        : undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    // Bei jedem Tastenanschlag in der Suche ändert sich `debouncedSearch` und
    // damit der queryKey — ohne `keepPreviousData` würde React Query dafür
    // `isLoading` kurz auf true setzen und die GANZE Seite (nicht nur die
    // Thread-Liste) durch das Skeleton ersetzen. Mit `keepPreviousData`
    // bleiben Sidebar/Liste/Detail stehen, während im Hintergrund neu geladen
    // wird.
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const anyProcessing = pages.some((p) =>
        p.threads.some((t) => t.label_status === "processing"),
      );
      return anyProcessing ? 4000 : false;
    },
  });

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const firstPage = pages[0];
  const threads = useMemo(() => pages.flatMap((p) => p.threads), [pages]);
  const integrations = useMemo(
    () => firstPage?.integrations ?? [],
    [firstPage],
  );
  const labels = firstPage?.labels ?? [];
  const creators = firstPage?.creators ?? [];
  const hasMore = !!hasNextPage;
  const loadingMore = isFetchingNextPage;
  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  useEffect(() => {
    if (!storageHydrated || integrations.length === 0) return;
    const stillValid = integrations.some((i) => i.id === selectedIntegrationId);
    // The first response supplies mailbox metadata; subsequent list requests
    // are scoped to the selected mailbox on the server. Also self-heals when
    // the previously selected mailbox (persisted in localStorage) no longer
    // exists — e.g. it was disconnected/deleted — so the inbox doesn't keep
    // requesting a dead integration_id and rendering an empty list forever.
    if (!selectedIntegrationId || !stillValid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIntegrationId(integrations[0].id);
      localStorage.setItem("inbox:selectedIntegrationId", integrations[0].id);
    }
  }, [integrations, selectedIntegrationId, storageHydrated]);

  // Kick off label-batch once on load so any pending threads get labeled.
  useEffect(() => {
    if (integrations.some((i) => i.auto_label)) {
      void fetch("/api/inbox/label-batch", { method: "POST" }).catch(() => {});
    }
  }, [integrations]);

  // Persist the open thread so the inbox reopens where the user left off.
  useEffect(() => {
    if (!storageHydrated) return;
    if (selectedId) localStorage.setItem("inbox:selectedThreadId", selectedId);
    else localStorage.removeItem("inbox:selectedThreadId");
  }, [selectedId, storageHydrated]);

  // Persist the work-panel width across sessions.
  useEffect(() => {
    if (!storageHydrated) return;
    localStorage.setItem(
      WORK_PANEL_WIDTH_KEY,
      String(Math.round(workPanelWidth)),
    );
  }, [storageHydrated, workPanelWidth]);

  function handleResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const shellWidth =
      shellRef.current?.getBoundingClientRect().width ?? Infinity;
    resizeRef.current = {
      startX: e.clientX,
      startWidth: workPanelWidth,
      max: Math.max(
        WORK_PANEL_MIN,
        Math.min(WORK_PANEL_MAX, shellWidth - INBOX_MIN),
      ),
    };
    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleResizeMove(e: React.PointerEvent<HTMLDivElement>) {
    const r = resizeRef.current;
    if (!r) return;
    // Panel sits on the right — dragging left widens it.
    const next = r.startWidth + (r.startX - e.clientX);
    setWorkPanelWidth(Math.min(r.max, Math.max(WORK_PANEL_MIN, next)));
  }

  function handleResizeEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    setIsResizing(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  // Derive effective integration: user pick → first available → null
  const effectiveIntegrationId = integrations.some(
    (i) => i.id === selectedIntegrationId,
  )
    ? selectedIntegrationId
    : (integrations[0]?.id ?? null);
  const selectedIntegration =
    integrations.find((i) => i.id === effectiveIntegrationId) ?? null;
  const autoLabel = selectedIntegration?.auto_label ?? false;

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filtered = threads;
  const inboxUnread = firstPage?.unreadCount ?? 0;

  const selectedIndex = filtered.findIndex((t) => t.id === selectedId);
  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  // ── Actions ──────────────────────────────────────────────────────────────────

  const syncPatch = useCallback(
    async (id: string, patch: ThreadPatch) => {
      const previous =
        queryClient.getQueryData<InfiniteData<InboxData>>(inboxQueryKey);
      patchThreadsInCache(queryClient, inboxQueryKey, id, (t) => ({
        ...t,
        ...patch,
      }));
      try {
        await patchThread(id, patch);
        // Sidebar-Badge zieht seinen Zähler aus einem eigenen, schlanken Query.
        if (patch.unread !== undefined || patch.folder !== undefined) {
          void queryClient.invalidateQueries({
            queryKey: QueryKeys.inbox.unreadCount(),
          });
        }
      } catch {
        queryClient.setQueryData(inboxQueryKey, previous);
      }
    },
    [inboxQueryKey, queryClient],
  );

  function handleSelect(t: Thread) {
    setSelectedId(t.id);
    if (t.unread) void syncPatch(t.id, { unread: false });
  }

  // Löst den Deep-Link auf, sobald der Ziel-Thread tatsächlich in der (evtl.
  // gerade erst für ein anderes Postfach nachgeladenen) Liste steckt: öffnet
  // ihn genau wie ein normaler Klick (inkl. "als gelesen markieren") und
  // scrollt ihn in der Thread-Liste sichtbar in den Viewport. Steckt er noch
  // nicht drin (z.B. weil er älter als die ersten 30 geladenen Threads
  // dieses Postfachs ist), wird automatisch nachgeladen, bis er auftaucht
  // oder wirklich nichts mehr nachzuladen ist.
  useEffect(() => {
    const pending = pendingThreadIdRef.current;
    if (!pending) return;
    const match = threads.find((t) => t.id === pending);
    if (match) {
      pendingThreadIdRef.current = null;
      setSelectedId(match.id);
      if (match.unread) void syncPatch(match.id, { unread: false });
      threadListRef.current
        ?.querySelector(`[data-thread-id="${pending}"]`)
        ?.scrollIntoView({ block: "center" });
      return;
    }
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [threads, syncPatch, hasNextPage, isFetchingNextPage, fetchNextPage]);

  function handleStar(id: string) {
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    void syncPatch(id, { starred: !t.starred });
  }

  function handleArchive(id: string) {
    if (selectedId === id) setSelectedId(null);
    void syncPatch(id, { folder: "ARCHIVE" });
  }

  function handleDelete(id: string) {
    if (selectedId === id) setSelectedId(null);
    void syncPatch(id, { folder: "TRASH" });
  }

  function handlePatch(id: string, patch: ThreadPatch) {
    void syncPatch(id, patch);
  }

  function handleFolderChange(f: Folder) {
    setFolder(f);
    setSelectedId(null);
    setSearch("");
    setActiveLabelId(null);
  }

  async function handleToggleLabel(
    threadId: string,
    labelId: string,
    assign: boolean,
  ) {
    const previous =
      queryClient.getQueryData<InfiniteData<InboxData>>(inboxQueryKey);

    patchThreadsInCache(queryClient, inboxQueryKey, threadId, (t) => {
      const labelObj = labels.find((l) => l.id === labelId);
      if (!labelObj) return t;
      return {
        ...t,
        labels: assign
          ? t.labels.some((l) => l.id === labelId)
            ? t.labels
            : [...t.labels, labelObj]
          : t.labels.filter((l) => l.id !== labelId),
      };
    });

    const url = assign
      ? `/api/inbox/${threadId}/labels`
      : `/api/inbox/${threadId}/labels/${labelId}`;
    const res = await fetch(url, {
      method: assign ? "POST" : "DELETE",
      ...(assign
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ labelId }),
          }
        : {}),
    });

    if (!res.ok) {
      queryClient.setQueryData(inboxQueryKey, previous);
    }
  }

  async function handleCreateLabel(name: string, color: string) {
    const res = await fetch("/api/inbox/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      await queryClient.refetchQueries({ queryKey: QueryKeys.inbox.list() });
    }
  }

  async function handleDeleteLabel(id: string) {
    await fetch(`/api/inbox/labels/${id}`, { method: "DELETE" });
    if (activeLabelId === id) setActiveLabelId(null);
    await queryClient.refetchQueries({ queryKey: QueryKeys.inbox.list() });
  }

  async function handleToggleAutoLabel() {
    if (!effectiveIntegrationId) return;
    const next = !autoLabel;
    patchIntegrationsInCache(
      queryClient,
      inboxQueryKey,
      effectiveIntegrationId,
      (i) => ({ ...i, auto_label: next }),
    );
    const res = await fetch(`/api/integrations/${effectiveIntegrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_label: next }),
    });
    if (!res.ok) {
      patchIntegrationsInCache(
        queryClient,
        inboxQueryKey,
        effectiveIntegrationId,
        (i) => ({ ...i, auto_label: !next }),
      );
    }
  }

  async function handleToggleCategoryLabel(
    threadId: string,
    name: string,
    color: string,
    assign: boolean,
  ) {
    // Find label by name in local list, or create it first
    let label = labels.find((l) => l.name === name);
    if (!label) {
      const res = await fetch("/api/inbox/labels/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) return;
      label = (await res.json()) as (typeof labels)[number];
      // Refresh labels list so new label appears in sidebar
      await queryClient.refetchQueries({ queryKey: QueryKeys.inbox.list() });
    }
    void handleToggleLabel(threadId, label.id, assign);
  }

  async function handleLabelThread(threadId: string) {
    patchThreadsInCache(queryClient, inboxQueryKey, threadId, (t) => ({
      ...t,
      label_status: "processing" as const,
    }));
    try {
      await fetch(`/api/inbox/${threadId}/label`, { method: "POST" });
    } finally {
      await queryClient.refetchQueries({ queryKey: QueryKeys.inbox.list() });
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await queryClient.refetchQueries({ queryKey: QueryKeys.inbox.list() });
    } finally {
      setSyncing(false);
    }
  }

  // ── Loading / error states ───────────────────────────────────────────────────

  if (isLoading) {
    return <OrbitInboxSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">Inbox konnte nicht geladen werden.</p>
        <Button
          type="button"
          variant="link"
          onClick={() =>
            void queryClient.refetchQueries({
              queryKey: QueryKeys.inbox.list(),
            })
          }
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
        >
          Nochmal versuchen
        </Button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      ref={shellRef}
      className={cn(
        "flex h-full min-w-0 overflow-hidden gap-2",
        isResizing && "cursor-col-resize select-none",
      )}
    >
      {/* Main inbox card: sidebar + thread list + email detail */}
      <div className="flex flex-1 min-w-0 overflow-hidden rounded-2xl bg-white ">
        {/* Sidebar — hidden while the thread list is shown */}
        {mergedView === "sidebar" && (
          <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-border">
            <InboxSidebar
              folder={folder}
              unreadCount={inboxUnread}
              integrations={integrations}
              selectedIntegrationId={effectiveIntegrationId}
              labels={labels}
              activeLabelId={activeLabelId}
              onFolderChange={(f) => {
                handleFolderChange(f);
                setMergedView("threads");
              }}
              onIntegrationChange={(id) => {
                setSelectedIntegrationId(id);
                localStorage.setItem("inbox:selectedIntegrationId", id);
                setSelectedId(null);
              }}
              onCompose={() => setComposeOpen(true)}
              onLabelClick={(id) =>
                setActiveLabelId((prev) => (prev === id ? null : id))
              }
              onCreateLabel={handleCreateLabel}
              onDeleteLabel={handleDeleteLabel}
              creators={creators}
            />
          </div>
        )}

        {/* Thread list — hidden while the sidebar is shown */}
        {mergedView === "threads" && (
          <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-[#E7E7E7]">
            <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMergedView("sidebar")}
                  className="h-6 w-6 rounded hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Button>
                <span className="text-sm font-semibold capitalize">
                  {folder}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Toggle
                        size="sm"
                        pressed={autoLabel}
                        onPressedChange={() => void handleToggleAutoLabel()}
                        aria-label="Auto Label"
                        className="data-[state=on]:bg-muted! data-[state=on]:text-foreground!"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Toggle>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Auto Label</TooltipContent>
                </Tooltip>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleSync()}
                  disabled={syncing}
                  className="h-7 w-7 rounded hover:bg-muted"
                >
                  <RefreshCcw
                    className={`h-4 w-4 text-muted-foreground ${syncing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>

            <div className="px-4 pb-2 pt-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen..."
                startAdornment={<Search />}
              />
            </div>

            {folder === "inbox" && (
              <div className="px-4 w-full pb-3">
                <CategorySelect category={category} onCategory={setCategory} />
              </div>
            )}

            <div ref={threadListRef} className="flex-1 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-20" />
                  <p className="text-sm">
                    {folder !== "inbox"
                      ? "Keine Nachrichten"
                      : search
                        ? "Keine Ergebnisse"
                        : "Alles gelesen"}
                  </p>
                </div>
              ) : (
                <>
                  {filtered.map((t) => (
                    <div key={t.id} data-thread-id={t.id}>
                      <ThreadItem
                        thread={t}
                        isSelected={selectedId === t.id}
                        onClick={() => handleSelect(t)}
                        onStar={() => handleStar(t.id)}
                        onArchive={() => handleArchive(t.id)}
                        onDelete={() => handleDelete(t.id)}
                      />
                    </div>
                  ))}
                  {hasMore && (
                    <div className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadMore()}
                        disabled={loadingMore}
                        className="w-full"
                      >
                        {loadingMore ? "Lädt…" : "Mehr laden"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Email detail */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {selected ? (
            <EmailDetailPanel
              thread={selected}
              threads={filtered}
              integrations={integrations}
              creators={creators}
              allLabels={labels}
              selectedIndex={selectedIndex}
              onClose={() => setSelectedId(null)}
              onPrev={() =>
                selectedIndex > 0 &&
                setSelectedId(filtered[selectedIndex - 1]!.id)
              }
              onNext={() =>
                selectedIndex < filtered.length - 1 &&
                setSelectedId(filtered[selectedIndex + 1]!.id)
              }
              onStar={() => handleStar(selected.id)}
              onArchive={() => handleArchive(selected.id)}
              onDelete={() => handleDelete(selected.id)}
              onAfterSend={() =>
                void queryClient.refetchQueries({
                  queryKey: QueryKeys.inbox.list(),
                })
              }
              onToggleLabel={(threadId, labelId, assign) =>
                void handleToggleLabel(threadId, labelId, assign)
              }
              onToggleCategoryLabel={(threadId, name, color, assign) =>
                void handleToggleCategoryLabel(threadId, name, color, assign)
              }
              onLabelThread={handleLabelThread}
            />
          ) : (
            <EmptyState onCompose={() => setComposeOpen(true)} />
          )}
        </div>
      </div>

      <ComposeEmailDialog
        key={`${composeDraft.to}-${composeDraft.subject}-${composeDraft.body}`}
        open={composeOpen}
        onOpenChange={setComposeOpen}
        integrationId={effectiveIntegrationId}
        mailboxCreatorId={
          integrations.find((i) => i.id === effectiveIntegrationId)
            ?.creator_id ?? null
        }
        creators={creators}
        initialTo={composeDraft.to}
        initialSubject={composeDraft.subject}
        initialBody={composeDraft.body}
      />

      {/* Drag handle — resize inbox vs. work panel */}
      {workPanelOpen && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Work-Panel-Breite ändern"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => setWorkPanelWidth(WORK_PANEL_DEFAULT)}
          className="group relative flex w-1.5 shrink-0 touch-none cursor-col-resize items-center justify-center"
        >
          <span
            className={cn(
              "h-12 w-1 rounded-full bg-[#E7E7E7] transition-colors group-hover:bg-muted-foreground/40",
              isResizing && "bg-muted-foreground/60",
            )}
          />
        </div>
      )}

      {/* Work panel */}
      <WorkPanel
        selected={selected}
        open={workPanelOpen}
        width={workPanelWidth}
        resizing={isResizing}
        integrations={integrations}
        creators={creators}
        workState={
          selected
            ? (workStates[selected.id] ?? { phase: "idle" })
            : { phase: "idle" }
        }
        analyseCount={
          Object.values(workStates).filter(
            (s) => s.phase === "extracted" || s.phase === "vorgang",
          ).length
        }
        vorgangCount={
          Object.values(workStates).filter((s) => s.phase === "vorgang").length
        }
        onToggle={() => setWorkPanelOpen((v) => !v)}
        onSetWorkState={(state) => {
          if (selected)
            setWorkStates((prev) => ({ ...prev, [selected.id]: state }));
        }}
        onPatch={handlePatch}
      />
    </div>
  );
}
