"use client";

import { Inbox, Loader2, RefreshCcw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkPanel } from "./work-panel";
import { InboxSidebar } from "./inbox-sidebar";
import { CategorySelect } from "./category-select";
import { ThreadItem } from "./thread-item";
import { EmailDetailPanel, EmptyState } from "./email-detail-panel";
import { ComposeEmailDialog } from "./compose-email-dialog";

import type { Folder, InboxData, Thread, ThreadPatch } from "./types";
import { QueryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchInboxData(): Promise<InboxData> {
  const res = await fetch("/api/inbox");
  if (!res.ok) throw new Error("Failed to load inbox");
  return res.json() as Promise<InboxData>;
}

async function syncIntegration(id: string): Promise<void> {
  await fetch(`/api/integrations/${id}/sync`, { method: "POST" });
}

async function patchThread(id: string, patch: ThreadPatch): Promise<void> {
  await fetch(`/api/inbox/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

// ─── Folder filter ────────────────────────────────────────────────────────────

function matchesFolder(thread: Thread, folder: Folder): boolean {
  const f = (thread.folder ?? "INBOX").toUpperCase();
  switch (folder) {
    case "inbox":   return f === "INBOX" || f === "";
    case "sent":    return f === "SENT";
    case "drafts":  return f === "DRAFTS" || f === "DRAFT";
    case "archive": return f === "ARCHIVE";
    case "spam":    return f === "SPAM";
    case "bin":     return f === "TRASH";
    default:        return true;
  }
}

// ─── OrbitInbox ───────────────────────────────────────────────────────────────

export function OrbitInbox() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<InboxData>({
    queryKey: QueryKeys.inbox.all(),
    queryFn: fetchInboxData,
  });

  const threads = data?.threads ?? [];
  const integrations = data?.integrations ?? [];

  // Sync all integrations once on first successful load
  useEffect(() => {
    if (!integrations.length) return;
    void Promise.allSettled(integrations.map((i) => syncIntegration(i.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrations.length]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [workPanelOpen, setWorkPanelOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoLabel, setAutoLabel] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  // Initialize selected integration when data first loads
  useEffect(() => {
    if (integrations.length > 0 && !selectedIntegrationId) {
      setSelectedIntegrationId(integrations[0]!.id);
    }
  }, [integrations, selectedIntegrationId]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filtered = threads.filter((t) => {
    if (selectedIntegrationId && t.integration_id !== selectedIntegrationId) return false;
    if (!matchesFolder(t, folder)) return false;

    if (search) {
      const q = search.toLowerCase();
      const matches =
        (t.sender_name?.toLowerCase().includes(q) ?? false) ||
        t.sender_email.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.preview?.toLowerCase().includes(q) ?? false);
      if (!matches) return false;
    }

    if (category === "all") return true;
    if (category === "unread") return t.unread;
    if (category === "important") return t.starred;
    return true;
  });

  const inboxUnread = threads.filter(
    (t) =>
      t.folder.toUpperCase() === "INBOX" &&
      t.unread &&
      (!selectedIntegrationId || t.integration_id === selectedIntegrationId),
  ).length;

  const selectedIndex = filtered.findIndex((t) => t.id === selectedId);
  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  // ── Actions ──────────────────────────────────────────────────────────────────

  const applyOptimistic = useCallback(
    (id: string, patch: ThreadPatch) => {
      queryClient.setQueryData<InboxData>(QueryKeys.inbox.all(), (old) => {
        if (!old) return old;
        return {
          ...old,
          threads: old.threads.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        };
      });
    },
    [queryClient],
  );

  function handleSelect(t: Thread) {
    setSelectedId(t.id);
    if (t.unread) {
      applyOptimistic(t.id, { unread: false });
      void patchThread(t.id, { unread: false });
    }
  }

  function handleStar(id: string) {
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    const patch = { starred: !t.starred };
    applyOptimistic(id, patch);
    void patchThread(id, patch);
  }

  function handleArchive(id: string) {
    applyOptimistic(id, { folder: "ARCHIVE" });
    void patchThread(id, { folder: "ARCHIVE" });
    if (selectedId === id) setSelectedId(null);
  }

  function handleDelete(id: string) {
    applyOptimistic(id, { folder: "TRASH" });
    void patchThread(id, { folder: "TRASH" });
    if (selectedId === id) setSelectedId(null);
  }

  function handlePatch(id: string, patch: ThreadPatch) {
    applyOptimistic(id, patch);
    void patchThread(id, patch);
  }

  function handleFolderChange(f: Folder) {
    setFolder(f);
    setSelectedId(null);
    setSearch("");
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await Promise.allSettled(integrations.map((i) => syncIntegration(i.id)));
      await queryClient.refetchQueries({ queryKey: QueryKeys.inbox.all() });
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
        <button
          onClick={() => void queryClient.refetchQueries({ queryKey: QueryKeys.inbox.all() })}
          className="text-xs underline hover:text-foreground"
        >
          Nochmal versuchen
        </button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-w-0 overflow-hidden gap-2">
      {/* Main inbox card: sidebar + thread list + email detail */}
      <div className="flex flex-1 min-w-0 overflow-hidden rounded-2xl border border-[#E7E7E7] bg-white shadow-sm">

        {/* Sidebar */}
        <InboxSidebar
          folder={folder}
          unreadCount={inboxUnread}
          integrations={integrations}
          selectedIntegrationId={selectedIntegrationId}
          onFolderChange={handleFolderChange}
          onIntegrationChange={(id) => {
            setSelectedIntegrationId(id);
            setSelectedId(null);
          }}
          onCompose={() => setComposeOpen(true)}
        />

        {/* Thread list */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-x border-[#E7E7E7]">
          <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-3">
            <span className="text-sm font-semibold capitalize">{folder}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAutoLabel((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium uppercase transition-colors",
                  autoLabel
                    ? "border-transparent bg-muted text-foreground"
                    : "border-[#E7E7E7] text-muted-foreground hover:bg-muted/50",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", autoLabel ? "bg-green-400" : "bg-red-400")} />
                Auto Label
              </button>
              <button
                onClick={() => void handleSync()}
                disabled={syncing}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
              >
                <RefreshCcw className={`h-4 w-4 text-muted-foreground ${syncing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="px-4 pb-2 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen..."
                className="h-8 w-full rounded-lg bg-muted pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground/20"
              />
            </div>
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

        {/* Email detail */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {selected ? (
            <EmailDetailPanel
              thread={selected}
              threads={filtered}
              integrations={integrations}
              selectedIndex={selectedIndex}
              onClose={() => setSelectedId(null)}
              onPrev={() => selectedIndex > 0 && setSelectedId(filtered[selectedIndex - 1]!.id)}
              onNext={() =>
                selectedIndex < filtered.length - 1 &&
                setSelectedId(filtered[selectedIndex + 1]!.id)
              }
              onStar={() => handleStar(selected.id)}
              onArchive={() => handleArchive(selected.id)}
              onDelete={() => handleDelete(selected.id)}
              onAfterSend={() => void queryClient.refetchQueries({ queryKey: QueryKeys.inbox.all() })}
            />
          ) : (
            <EmptyState onCompose={() => setComposeOpen(true)} />
          )}
        </div>
      </div>

      <ComposeEmailDialog open={composeOpen} onOpenChange={setComposeOpen} integrationId={selectedIntegrationId} />

      {/* Work panel */}
      <WorkPanel
        selected={selected}
        open={workPanelOpen}
        integrations={integrations}
        onToggle={() => setWorkPanelOpen((v) => !v)}
        onPatch={handlePatch}
      />
    </div>
  );
}
