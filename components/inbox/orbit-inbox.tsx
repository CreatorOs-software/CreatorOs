"use client";

import {
  ChevronLeft,
  Inbox,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkPanel } from "./workpanel/work-panel";
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

async function fetchInboxData(params: URLSearchParams): Promise<InboxData> {
  const res = await fetch(`/api/inbox?${params}`);
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

// ─── OrbitInbox ───────────────────────────────────────────────────────────────

export function OrbitInbox() {
  const queryClient = useQueryClient();

  // Deeplink aus der Glocke: /inbox?thread=<id> überschreibt den zuletzt
  // geöffneten Thread einmalig beim Laden.
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      searchParams.get("thread") ??
      localStorage.getItem("inbox:selectedThreadId"),
  );
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<
    string | null
  >(() => localStorage.getItem("inbox:selectedIntegrationId"));
  const [category, setCategory] = useState("all");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [workPanelOpen, setWorkPanelOpen] = useState(true);
  const [workPanelWidth, setWorkPanelWidth] = useState<number>(
    readStoredWorkPanelWidth,
  );
  const [isResizing, setIsResizing] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startWidth: number;
    max: number;
  } | null>(null);
  const [mergedMode, setMergedMode] = useState(true);
  const [mergedView, setMergedView] = useState<"sidebar" | "threads">(
    "sidebar",
  );
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [workStates, setWorkStates] = useState<Record<string, WorkPanelState>>(
    {},
  );

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

  const { data, isLoading, isError } = useQuery<InboxData>({
    queryKey: inboxQueryKey,
    queryFn: () => fetchInboxData(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const threads = query.state.data?.threads ?? [];
      return threads.some((t) => t.label_status === "processing")
        ? 4000
        : false;
    },
  });

  const threads = data?.threads ?? [];
  const integrations = useMemo(
    () => data?.integrations ?? [],
    [data?.integrations],
  );
  const labels = data?.labels ?? [];
  const creators = data?.creators ?? [];

  useEffect(() => {
    if (!selectedIntegrationId && integrations[0]?.id) {
      // The first response supplies mailbox metadata; subsequent list requests
      // are scoped to the selected mailbox on the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIntegrationId(integrations[0].id);
    }
  }, [integrations, selectedIntegrationId]);

  // Kick off label-batch once on load so any pending threads get labeled.
  useEffect(() => {
    if (integrations.some((i) => i.auto_label)) {
      void fetch("/api/inbox/label-batch", { method: "POST" }).catch(() => {});
    }
  }, [integrations]);

  // Persist the open thread so the inbox reopens where the user left off.
  useEffect(() => {
    if (selectedId) localStorage.setItem("inbox:selectedThreadId", selectedId);
    else localStorage.removeItem("inbox:selectedThreadId");
  }, [selectedId]);

  // Persist the work-panel width across sessions.
  useEffect(() => {
    localStorage.setItem(
      WORK_PANEL_WIDTH_KEY,
      String(Math.round(workPanelWidth)),
    );
  }, [workPanelWidth]);

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
  const inboxUnread = data?.unreadCount ?? 0;

  const selectedIndex = filtered.findIndex((t) => t.id === selectedId);
  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  // ── Actions ──────────────────────────────────────────────────────────────────

  const syncPatch = useCallback(
    async (id: string, patch: ThreadPatch) => {
      const previous = queryClient.getQueryData<InboxData>(inboxQueryKey);
      queryClient.setQueryData<InboxData>(inboxQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          threads: old.threads.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        };
      });
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
    const previous = queryClient.getQueryData<InboxData>(inboxQueryKey);

    queryClient.setQueryData<InboxData>(inboxQueryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        threads: old.threads.map((t) => {
          if (t.id !== threadId) return t;
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
        }),
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
    // Optimistic update in cache
    queryClient.setQueryData<InboxData>(inboxQueryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        integrations: old.integrations.map((i) =>
          i.id === effectiveIntegrationId ? { ...i, auto_label: next } : i,
        ),
      };
    });
    const res = await fetch(`/api/integrations/${effectiveIntegrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_label: next }),
    });
    if (!res.ok) {
      // Rollback
      queryClient.setQueryData<InboxData>(inboxQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          integrations: old.integrations.map((i) =>
            i.id === effectiveIntegrationId ? { ...i, auto_label: !next } : i,
          ),
        };
      });
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
    queryClient.setQueryData<InboxData>(inboxQueryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        threads: old.threads.map((t) =>
          t.id === threadId ? { ...t, label_status: "processing" as const } : t,
        ),
      };
    });
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
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
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
        {/* Sidebar — hidden in merged+threads mode */}
        {(!mergedMode || mergedView === "sidebar") && (
          <div
            className={
              mergedMode
                ? "flex w-72 shrink-0 flex-col overflow-hidden border-r border-[#E7E7E7]"
                : "contents"
            }
          >
            <InboxSidebar
              folder={folder}
              unreadCount={inboxUnread}
              integrations={integrations}
              selectedIntegrationId={effectiveIntegrationId}
              labels={labels}
              activeLabelId={activeLabelId}
              onFolderChange={(f) => {
                handleFolderChange(f);
                if (mergedMode) setMergedView("threads");
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
              merged={mergedMode}
              onMergedChange={(v) => {
                setMergedMode(v);
                if (!v) setMergedView("sidebar");
              }}
            />
          </div>
        )}

        {/* Thread list — hidden in merged+sidebar mode */}
        {(!mergedMode || mergedView === "threads") && (
          <div
            className={cn(
              "flex shrink-0 flex-col overflow-hidden",
              mergedMode
                ? "w-72 border-r border-[#E7E7E7]"
                : "w-80 border-x border-[#E7E7E7]",
            )}
          >
            <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-3">
              <div className="flex items-center gap-1.5">
                {mergedMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMergedView("sidebar")}
                    className="h-6 w-6 rounded hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <span className="text-sm font-semibold capitalize">
                  {folder}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      size="sm"
                      pressed={autoLabel}
                      onPressedChange={() => void handleToggleAutoLabel()}
                      aria-label="Auto Label"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Toggle>
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
              <div className="px-4 pb-3">
                <CategorySelect category={category} onCategory={setCategory} />
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-1">
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
                filtered.map((t) => (
                  <ThreadItem
                    key={t.id}
                    thread={t}
                    isSelected={selectedId === t.id}
                    onClick={() => handleSelect(t)}
                    onStar={() => handleStar(t.id)}
                    onArchive={() => handleArchive(t.id)}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))
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
        open={composeOpen}
        onOpenChange={setComposeOpen}
        integrationId={effectiveIntegrationId}
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
