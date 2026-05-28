"use client";

import { useEffect, useRef, useState } from "react";
import {
  Star,
  RefreshCw,
  Send,
  ChevronRight,
  ChevronLeft,
  Mail,
  MailOpen,
  Loader2,
  Inbox,
  Reply,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Thread = {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  preview: string | null;
  body: string | null;
  body_html: string | null;
  received_at: string;
  unread: boolean;
  starred: boolean;
  priority: "low" | "med" | "high";
  integration_id: string | null;
  folder: string | null;
};

type Integration = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
};

type Filter = "all" | "unread" | "starred";
type MailboxId = string | "__all__" | "__sent__" | "__starred__";

const PRIORITY_LABEL: Record<string, string> = {
  high: "H",
  med: "M",
  low: "L",
};
const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-orange-500/10 text-orange-600",
  med: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};
const PRIORITY_FULL: Record<string, string> = {
  high: "Hoch",
  med: "Mittel",
  low: "Niedrig",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString("de-DE", { weekday: "short" });
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mailboxInitials(email: string) {
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function InboxView() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/inbox")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setThreads(json.threads ?? []);
        setIntegrations(json.integrations ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  // Filtered list based on current mailbox + filter tab
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

  // Derive selected: if current selectedId isn't in the filtered list, fall back to first
  const effectiveSelectedId =
    listView === "threads" &&
    filtered.length > 0 &&
    !filtered.find((t) => t.id === selectedId)
      ? filtered[0].id
      : selectedId;

  const selected = threads.find((t) => t.id === effectiveSelectedId) ?? null;

  const inboxThreads = threads.filter((t) => t.folder !== "sent");
  const sentThreads = threads.filter((t) => t.folder === "sent");
  const starredThreads = threads.filter(
    (t) => t.starred && t.folder !== "sent",
  );
  const totalUnread = inboxThreads.filter((t) => t.unread).length;

  function patchLocal(id: string, patch: Partial<Thread>) {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
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
    refresh();
  }

  async function handleSync() {
    setSyncing(true);
    await Promise.all(
      integrations.map((i) =>
        fetch(`/api/integrations/${i.id}/sync`, { method: "POST" }),
      ),
    );
    refresh();
    setSyncing(false);
  }

  function openMailbox(id: MailboxId | null) {
    setActiveMailboxId(id);
    setListView("threads");
    setFilter("all");
    setSelectedId(null);
  }

  const activeMailbox =
    integrations.find((i) => i.id === activeMailboxId) ?? null;
  const activeLabel =
    activeMailboxId === "__sent__"
      ? "Gesendet"
      : activeMailboxId === "__starred__"
        ? "Markiert"
        : activeMailboxId === "__all__" || !activeMailboxId
          ? "Alle Postfächer"
          : (activeMailbox?.display_name ?? activeMailbox?.email ?? "Postfach");

  return (
    <div className="h-full flex gap-3 min-w-0">
      {/* ─── Thread List Card ─── */}
      <div className="w-72 shrink-0 flex flex-col bg-card rounded-2xl overflow-hidden">
        {/* ── MAILBOX OVERVIEW ── */}
        {listView === "mailboxes" && (
          <>
            <div className="px-4 pt-4 pb-3 border-b border-border-light flex items-center justify-between">
              <span className="text-sm font-semibold">Postfächer</span>
              <button
                onClick={handleSync}
                disabled={syncing || integrations.length === 0}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", syncing && "animate-spin")}
                />
              </button>
            </div>

            {/* Individual mailboxes */}
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : integrations.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                <p className="mb-2">Kein Postfach verbunden.</p>
                <a
                  href="/integrations"
                  className="underline underline-offset-2"
                >
                  Jetzt verbinden →
                </a>
              </div>
            ) : (
              integrations.map((integ) => {
                const unread = inboxThreads.filter(
                  (t) => t.integration_id === integ.id && t.unread,
                ).length;
                const initials = mailboxInitials(integ.email);
                return (
                  <button
                    key={integ.id}
                    onClick={() => openMailbox(integ.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="w-9 h-9 rounded-xl bg-sidebar flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {integ.display_name ?? integ.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {integ.email}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="text-[10px] font-semibold bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none shrink-0">
                        {unread}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                );
              })
            )}

            {integrations.length > 0 && (
              <div className="mx-4 my-2 h-px bg-border-light" />
            )}

            <div className="flex-1 overflow-y-auto py-1">
              {/* Alle Postfächer */}
              <MailboxRow
                icon={<Inbox className="w-4 h-4" />}
                label="Alle Postfächer"
                sub={`${integrations.length} Postfach${integrations.length !== 1 ? "fächer" : ""}`}
                badge={totalUnread}
                onClick={() => openMailbox("__all__")}
              />

              {/* Gesendet */}
              <MailboxRow
                icon={<Send className="w-4 h-4" />}
                label="Gesendet"
                sub={`${sentThreads.length} Nachricht${sentThreads.length !== 1 ? "en" : ""}`}
                onClick={() => openMailbox("__sent__")}
              />

              {/* Markiert */}
              <MailboxRow
                icon={
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                }
                label="Markiert"
                sub={`${starredThreads.length} Nachricht${starredThreads.length !== 1 ? "en" : ""}`}
                onClick={() => openMailbox("__starred__")}
              />
            </div>
          </>
        )}

        {/* ── THREAD LIST ── */}
        {listView === "threads" && (
          <>
            {/* Thread list header */}
            <div className="px-4 pt-4 pb-3 border-b border-border-light">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setListView("mailboxes")}
                  className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold flex-1 truncate">
                  {activeLabel}
                </span>
                {filtered.filter((t) => t.unread).length > 0 && (
                  <span className="text-[10px] font-semibold bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none">
                    {filtered.filter((t) => t.unread).length}
                  </span>
                )}
                <button
                  onClick={handleSync}
                  disabled={syncing || integrations.length === 0}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
                >
                  <RefreshCw
                    className={cn("w-3.5 h-3.5", syncing && "animate-spin")}
                  />
                </button>
              </div>

              {/* Filter tabs — only for non-special mailboxes */}
              {activeMailboxId !== "__sent__" && (
                <div className="flex gap-1 bg-muted rounded-xl p-1">
                  {(["all", "unread", "starred"] as Filter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "flex-1 text-xs py-1 rounded-lg transition-colors font-medium",
                        filter === f
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {f === "all"
                        ? "Alle"
                        : f === "unread"
                          ? "Ungelesen"
                          : "Markiert"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Threads */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-4 text-center">
                  <Inbox className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Keine Nachrichten</p>
                </div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectThread(t)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-border-light/50 hover:bg-muted/50 transition-colors group",
                      selectedId === t.id && "bg-muted",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span
                        className={cn(
                          "text-sm truncate",
                          t.unread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {t.sender_name ?? t.sender_email}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {formatDate(t.received_at)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "text-xs truncate mb-0.5",
                        t.unread ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {t.subject}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {t.preview}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {t.unread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                        )}
                        <button
                          onClick={(e) => handleStar(t, e)}
                          className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded",
                            t.starred && "opacity-100",
                          )}
                        >
                          <Star
                            className={cn(
                              "w-3 h-3",
                              t.starred
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground",
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Middle: Message + Reply ─── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Message Pane */}
        <div className="flex-1 min-h-0 bg-card rounded-2xl flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="px-6 py-4 border-b border-border-light shrink-0">
                <h2 className="text-base font-semibold mb-1 leading-snug">
                  {selected.subject}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {selected.sender_name ?? selected.sender_email}
                  </span>
                  {selected.sender_name && (
                    <span className="text-xs">
                      &lt;{selected.sender_email}&gt;
                    </span>
                  )}
                  <span className="ml-auto text-xs">
                    {formatFullDate(selected.received_at)}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {selected.body_html ? (
                  <div
                    className="prose prose-sm max-w-none text-foreground [&_a]:text-foreground [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: selected.body_html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                    {selected.body ?? selected.preview ?? ""}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Inbox className="w-10 h-10 opacity-20" />
              <p className="text-sm">Keine Nachricht ausgewählt</p>
            </div>
          )}
        </div>

        {/* Reply Composer */}
        {selected && selected.folder !== "sent" && (
          <div className="bg-card rounded-2xl shrink-0">
            <div className="px-4 py-2.5 border-b border-border-light flex items-center gap-2">
              <Reply className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Antwort an{" "}
                <span className="text-foreground">{selected.sender_email}</span>
              </span>
            </div>
            <div className="p-3">
              <textarea
                ref={replyRef}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                    handleSend();
                }}
                placeholder="Antwort schreiben… (⌘+Enter senden)"
                rows={4}
                className="w-full resize-none text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-xl bg-yellow-400 text-black font-medium hover:bg-yellow-300 transition-colors disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {sending ? "Senden…" : "Senden"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Work Panel (collapsible) ─── */}
      <div
        className={cn(
          "shrink-0 flex flex-col bg-card rounded-2xl overflow-hidden transition-all duration-300",
          workPanelOpen ? "w-64" : "w-12",
        )}
      >
        {/* Toggle */}
        <button
          onClick={() => setWorkPanelOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-4 border-b border-border-light hover:bg-muted transition-colors w-full shrink-0",
            !workPanelOpen && "justify-center",
          )}
        >
          {workPanelOpen ? (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Work Panel
              </span>
            </>
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Collapsed: show icons */}
        {!workPanelOpen && selected && (
          <div className="flex flex-col items-center gap-1 py-3 px-1">
            <button
              onClick={() => handleStar(selected)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                selected.starred
                  ? "text-yellow-400 bg-yellow-400/10"
                  : "text-muted-foreground hover:bg-muted",
              )}
              title="Markieren"
            >
              <Star
                className={cn("w-4 h-4", selected.starred && "fill-yellow-400")}
              />
            </button>
            <button
              onClick={() => patch(selected.id, { unread: !selected.unread })}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              title={
                selected.unread
                  ? "Als gelesen markieren"
                  : "Als ungelesen markieren"
              }
            >
              {selected.unread ? (
                <MailOpen className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
            </button>
            <div className="w-5 h-px bg-border-light my-1" />
            {(["high", "med", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => patch(selected.id, { priority: p })}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-colors",
                  selected.priority === p
                    ? PRIORITY_COLOR[p]
                    : "text-muted-foreground hover:bg-muted",
                )}
                title={PRIORITY_FULL[p]}
              >
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        )}

        {/* Expanded content */}
        {workPanelOpen && selected && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Actions */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Aktionen
              </p>
              <button
                onClick={() => handleStar(selected)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
                  selected.starred
                    ? "bg-yellow-400/10 text-yellow-600"
                    : "hover:bg-muted text-muted-foreground",
                )}
              >
                <Star
                  className={cn(
                    "w-4 h-4",
                    selected.starred && "fill-yellow-400 text-yellow-400",
                  )}
                />
                {selected.starred ? "Markierung entfernen" : "Markieren"}
              </button>
              <button
                onClick={() => patch(selected.id, { unread: !selected.unread })}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-muted text-muted-foreground transition-colors"
              >
                {selected.unread ? (
                  <MailOpen className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {selected.unread
                  ? "Als gelesen markieren"
                  : "Als ungelesen markieren"}
              </button>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Priorität
              </p>
              <div className="flex gap-1.5">
                {(["high", "med", "low"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => patch(selected.id, { priority: p })}
                    className={cn(
                      "flex-1 text-xs py-1.5 rounded-xl border transition-colors",
                      selected.priority === p
                        ? PRIORITY_COLOR[p] + " border-transparent font-medium"
                        : "border-border-light text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {PRIORITY_FULL[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Details
              </p>
              <div className="bg-muted/50 rounded-xl p-3 flex flex-col gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Von</span>
                  <span className="font-medium text-right truncate">
                    {selected.sender_name ?? selected.sender_email}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">E-Mail</span>
                  <span className="font-medium text-right truncate">
                    {selected.sender_email}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Datum</span>
                  <span className="font-medium">
                    {formatDate(selected.received_at)}
                  </span>
                </div>
                {selected.integration_id && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">
                      Postfach
                    </span>
                    <span className="font-medium text-right truncate">
                      {integrations.find(
                        (i) => i.id === selected.integration_id,
                      )?.email ?? "—"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {workPanelOpen && !selected && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center">
              Keine Nachricht ausgewählt
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MailboxRow({
  icon,
  label,
  sub,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
    >
      <span className="w-9 h-9 rounded-xl bg-sidebar flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {badge != null && badge > 0 && (
        <span className="text-[10px] font-semibold bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none shrink-0">
          {badge}
        </span>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}
