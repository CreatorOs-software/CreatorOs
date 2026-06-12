"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { useRef, useState } from "react";
import {
  type Thread,
  type Integration,
  type Creator,
  type InboxData,
  type Filter,
  type MailboxId,
} from "@/components/inbox/inbox-types";
import { ThreadList } from "@/components/inbox/thread-list";
import { MailboxOverview } from "@/components/inbox/mailbox-overview";
import { MessagePane } from "@/components/inbox/message-pane";
import { WorkPanel } from "@/components/inbox/work-panel";

export default function InboxPage() {
  const queryClient = useQueryClient();

  const { data, isPending, isFetching } = useQuery<InboxData>({
    queryKey: QueryKeys.inbox.all(),
    queryFn: async () => {
      const prev = queryClient.getQueryData<InboxData>(["inbox"]);
      const prevIntegrations = prev?.integrations ?? [];
      if (prevIntegrations.length > 0) {
        await Promise.allSettled(
          prevIntegrations.map((i) =>
            fetch(`/api/integrations/${i.id}/sync`, { method: "POST" }),
          ),
        );
      }
      const r = await fetch("/api/inbox");
      if (!r.ok) throw new Error("Failed to fetch inbox");
      return r.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const threads: Thread[] = data?.threads ?? [];
  const integrations: Integration[] = data?.integrations ?? [];
  const creators: Creator[] = data?.creators ?? [];
  const loading = isPending;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [activeMailboxId, setActiveMailboxId] = useState<MailboxId | null>(
    null,
  );
  const [listView, setListView] = useState<"mailboxes" | "threads">(
    "mailboxes",
  );
  const [workPanelOpen, setWorkPanelOpen] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const inboxThreads = threads.filter((t) => t.folder !== "sent");
  const sentThreads = threads.filter((t) => t.folder === "sent");
  const starredThreads = threads.filter(
    (t) => t.starred && t.folder !== "sent",
  );
  const totalUnread = inboxThreads.filter((t) => t.unread).length;

  const filtered = threads.filter((t) => {
    if (activeMailboxId === "__sent__") return t.folder === "sent";
    if (activeMailboxId === "__starred__")
      return t.starred && t.folder !== "sent";
    if (t.folder === "sent") return false;
    if (activeMailboxId && activeMailboxId !== "__all__") {
      if (t.integration_id !== activeMailboxId) return false;
    }
    if (filter === "unread") return t.unread;
    if (filter === "starred") return t.starred;
    return true;
  });

  const effectiveSelectedId =
    listView === "threads" &&
    filtered.length > 0 &&
    !filtered.find((t) => t.id === selectedId)
      ? filtered[0].id
      : selectedId;

  const selected = threads.find((t) => t.id === effectiveSelectedId) ?? null;

  const activeMailbox =
    integrations.find((i) => i.id === activeMailboxId) ?? null;
  const activeMailboxCreator = activeMailbox?.creator_id
    ? (creators.find((c) => c.id === activeMailbox.creator_id) ?? null)
    : null;
  const activeLabel =
    activeMailboxId === "__sent__"
      ? "Gesendet"
      : activeMailboxId === "__starred__"
        ? "Markiert"
        : activeMailboxId === "__all__" || !activeMailboxId
          ? "Alle Postfächer"
          : (activeMailboxCreator?.full_name ??
            activeMailbox?.display_name ??
            activeMailbox?.email ??
            "Postfach");

  function patchLocal(id: string, patch: Partial<Thread>) {
    queryClient.setQueryData<InboxData>(["inbox"], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        threads: prev.threads.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      };
    });
  }

  async function patch(id: string, update: Partial<Thread>) {
    patchLocal(id, update);
    await fetch(`/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
  }

  async function selectThread(t: Thread) {
    setSelectedId(t.id);
    setReply("");
    if (t.unread) await patch(t.id, { unread: false });
  }

  async function handleStar(t: Thread, e?: React.MouseEvent) {
    e?.stopPropagation();
    await patch(t.id, { starred: !t.starred });
  }

  async function handleSend() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    await fetch(`/api/inbox/${selected.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setReply("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.all() });
  }

  function handleSync() {
    queryClient.refetchQueries({ queryKey: QueryKeys.inbox.all() });
  }

  function openMailbox(id: MailboxId) {
    setActiveMailboxId(id);
    setListView("threads");
    setFilter("all");
    setSelectedId(null);
  }

  return (
    <div className="h-full flex gap-3 min-w-0">
      {/* Thread list card */}
      <div className="w-72 shrink-0 flex flex-col bg-card rounded-2xl overflow-hidden">
        {listView === "mailboxes" ? (
          <MailboxOverview
            integrations={integrations}
            creators={creators}
            inboxThreads={inboxThreads}
            sentThreads={sentThreads}
            starredThreads={starredThreads}
            totalUnread={totalUnread}
            isFetching={isFetching}
            loading={loading}
            onSync={handleSync}
            onOpenMailbox={openMailbox}
          />
        ) : (
          <ThreadList
            filtered={filtered}
            selectedId={selectedId}
            activeMailboxId={activeMailboxId}
            activeLabel={activeLabel}
            filter={filter}
            isFetching={isFetching}
            integrationsCount={integrations.length}
            onBack={() => setListView("mailboxes")}
            onSync={handleSync}
            onSelectThread={selectThread}
            onStar={handleStar}
            onSetFilter={setFilter}
          />
        )}
      </div>

      <MessagePane
        selected={selected}
        reply={reply}
        sending={sending}
        replyRef={replyRef}
        onSend={handleSend}
        onPatch={patch}
        onStar={handleStar}
        onReplyChange={setReply}
      />

      <WorkPanel
        selected={selected}
        open={workPanelOpen}
        integrations={integrations}
        onToggle={() => setWorkPanelOpen((v) => !v)}
        onPatch={patch}
      />
    </div>
  );
}
