"use client";

import DOMPurify from "dompurify";
import Image from "next/image";
import {
  Archive,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePlus,
  Forward,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Reply,
  ReplyAll,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { QueryKeys } from "@/lib/query-keys";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Thread } from "./types";
import type { EmailLabel } from "@/domains/communication";
import { SYSTEM_LABELS } from "./constants";
import {
  formatDate,
  formatFullDate,
  getDisplayName,
  getInitial,
} from "./utils";
import { Avatar } from "@/components/ui/avatar-creator";
import { TemplateQuickInsert } from "./templates/template-quick-insert";
import { NeueTemplateDialog } from "./templates/neue-template-dialog";
import { useVariableSlashMenu } from "./templates/variable-slash-menu";
import { VariablePicker } from "./templates/variable-picker";

// ─── ReplyComposer ────────────────────────────────────────────────────────────

type ReplyComposerProps = {
  thread: Thread;
  cc?: string[];
  onClose: () => void;
  onAfterSend: () => void;
};

function ReplyComposer({
  thread,
  cc,
  onClose,
  onAfterSend,
}: ReplyComposerProps) {
  const [reply, setReply] = useState("");
  const [insertedTemplate, setInsertedTemplate] = useState(false);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const slashMenu = useVariableSlashMenu({
    mode: "resolve",
    resolveContext: { threadId: thread.id },
    textareaRef: replyRef,
    onReplace: setReply,
    onUnresolved: (paths) => setUnresolved((prev) => [...new Set([...prev, ...paths])]),
  });

  async function handleSend() {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/inbox/${thread.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply, cc }),
      });
      if (!res.ok) throw new Error(await res.text());
      onAfterSend();
      onClose();
    } catch {
      // keep composer open so the user can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-6 my-3 overflow-hidden rounded-xl border border-[#E7E7E7]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Antwort schreiben</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            kein Vorgang – wird nicht dokumentiert
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* To line */}
      <div className="border-b border-[#E7E7E7] px-4 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {thread.sender_email}
        </span>
        <span className="mx-1.5 opacity-40">·</span>
        <span>Re: {thread.subject}</span>
      </div>

      {/* CC line (Reply All only) */}
      {cc && cc.length > 0 && (
        <div className="border-b border-[#E7E7E7] px-4 py-2 text-xs text-muted-foreground">
          <span className="mr-1.5 font-medium text-foreground">CC:</span>
          {cc.join(", ")}
        </div>
      )}

      {/* Vorlage einfügen hint */}
      {insertedTemplate && unresolved.length === 0 && (
        <div className="flex items-center gap-2 border-b border-[#E7E7E7] bg-[#F3EDFE] px-4 py-2 text-xs font-medium text-[#6829D4]">
          <Sparkles className="h-3 w-3" />
          Vorlage eingefügt – bitte gegenlesen, du sendest.
        </div>
      )}

      {/* Unresolved variable warning */}
      {unresolved.length > 0 && (
        <div className="flex items-center gap-2 border-b border-[#E7E7E7] bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          {unresolved.length}{" "}
          {unresolved.length === 1 ? "Variable konnte" : "Variablen konnten"}{" "}
          nicht aufgelöst werden ({unresolved.map((v) => `\${${v}}`).join(", ")})
        </div>
      )}

      {/* Vorlagen als Chips (bzw. Dropdown ab >4) */}
      <TemplateQuickInsert
        channel="email"
        threadId={thread.id}
        onInsert={(result) => {
          setReply(result.body);
          setInsertedTemplate(true);
          setUnresolved(result.unresolved);
        }}
        className="border-b border-[#E7E7E7] px-4 py-2"
      />

      {/* Textarea */}
      <textarea
        ref={replyRef}
        autoFocus
        readOnly={slashMenu.loading}
        value={reply}
        onChange={(e) => {
          setReply(e.target.value);
          if (!e.target.value) {
            setInsertedTemplate(false);
            setUnresolved([]);
          }
          slashMenu.handleChange(e);
        }}
        onKeyDown={(e) => {
          if (slashMenu.handleKeyDown(e)) return;
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSend();
        }}
        placeholder="Antwort schreiben … oder / für Variablen, oben eine Vorlage wählen."
        className="min-h-32 w-full resize-none bg-transparent px-4 py-3 text-sm outline-none"
      />
      {slashMenu.menu}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#E7E7E7] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <Paperclip className="h-3.5 w-3.5" />
            Mediakit anhängen
          </button>
          <VariablePicker onPick={slashMenu.insertVariable} />
          <button
            type="button"
            disabled={!reply.trim()}
            onClick={() => setSavingAsTemplate(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FilePlus className="h-3.5 w-3.5" />
            Vorlage erstellen
          </button>
        </div>
        <button
          disabled={!reply.trim() || sending}
          onClick={handleSend}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {sending && <Loader2 className="h-3 w-3 animate-spin" />}
          {sending ? "Senden…" : "Senden"}
        </button>
      </div>

      <NeueTemplateDialog
        open={savingAsTemplate}
        onClose={() => setSavingAsTemplate(false)}
        initialValue={{ body: reply, channel: "email" }}
      />
    </div>
  );
}

// ─── EmailDetailPanel ─────────────────────────────────────────────────────────

type EmailDetailPanelProps = {
  thread: Thread;
  threads: Thread[];
  integrations: import("./types").Integration[];
  allLabels: EmailLabel[];
  selectedIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onAfterSend: () => void;
  onToggleLabel: (threadId: string, labelId: string, assign: boolean) => void;
  onToggleCategoryLabel: (
    threadId: string,
    name: string,
    color: string,
    assign: boolean,
  ) => void;
  onLabelThread: (threadId: string) => Promise<void>;
};

export function EmailDetailPanel({
  thread,
  threads,
  integrations,
  allLabels,
  selectedIndex,
  onClose,
  onPrev,
  onNext,
  onStar,
  onArchive,
  onDelete,
  onAfterSend,
  onToggleLabel,
  onToggleCategoryLabel,
  onLabelThread,
}: EmailDetailPanelProps) {
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | null>(null);
  const [labeling, setLabeling] = useState(false);
  const queryClient = useQueryClient();

  const { data: conversationData } = useQuery({
    queryKey: QueryKeys.inbox.conversation(thread.id),
    queryFn: async () => {
      const res = await fetch(`/api/inbox/${thread.id}/conversation`);
      if (!res.ok) return { messages: [] as Thread[] };
      return res.json() as Promise<{ messages: Thread[] }>;
    },
    enabled: !!thread.conversation_id,
  });
  const conversationMessages = conversationData?.messages ?? [];

  function handleAfterSend() {
    void queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.conversation(thread.id) });
    onAfterSend();
  }

  const displayName = getDisplayName(thread.sender_name, thread.sender_email);
  const initial = getInitial(thread.sender_name, thread.sender_email);

  const recipientLabel =
    thread.recipient_email ??
    integrations.find((i) => i.id === thread.integration_id)?.email ??
    "Du";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            onClick={onPrev}
            disabled={selectedIndex <= 0}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNext}
            disabled={selectedIndex >= threads.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={onStar}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          >
            <Star
              className={cn(
                "h-4 w-4",
                thread.starred
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground",
              )}
            />
          </button>
          <button
            onClick={() => {
              if (labeling) return;
              setLabeling(true);
              void onLabelThread(thread.id).finally(() => setLabeling(false));
            }}
            disabled={labeling || thread.label_status === "processing"}
            title="Diese E-Mail labeln"
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
          >
            <Sparkles className={cn("h-4 w-4 text-muted-foreground", labeling && "animate-pulse")} />
          </button>
          {/* Label picker */}
          <Popover>
            <PopoverTrigger
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
              title="Labels"
            >
              <Tag className="h-4 w-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-52 p-1">
              {/* System categories */}
              <p className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Kategorien
              </p>
              {SYSTEM_LABELS.map((sys) => {
                const assigned = thread.labels.some((l) => l.name === sys.name);
                return (
                  <button
                    key={sys.name}
                    onClick={() =>
                      onToggleCategoryLabel(
                        thread.id,
                        sys.name,
                        sys.color,
                        !assigned,
                      )
                    }
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sys.color }}
                    />
                    <span className="flex-1 truncate text-left">
                      {sys.name}
                    </span>
                    {assigned && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                    )}
                  </button>
                );
              })}
              {/* User labels */}
              {allLabels.filter(
                (l) => !SYSTEM_LABELS.some((s) => s.name === l.name),
              ).length > 0 && (
                <>
                  <div className="my-1 border-t border-[#E7E7E7]" />
                  <p className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Labels
                  </p>
                  {allLabels
                    .filter(
                      (l) => !SYSTEM_LABELS.some((s) => s.name === l.name),
                    )
                    .map((label) => {
                      const assigned = thread.labels.some(
                        (l2) => l2.id === label.id,
                      );
                      return (
                        <button
                          key={label.id}
                          onClick={() =>
                            onToggleLabel(thread.id, label.id, !assigned)
                          }
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 truncate text-left">
                            {label.name}
                          </span>
                          {assigned && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                          )}
                        </button>
                      );
                    })}
                </>
              )}
            </PopoverContent>
          </Popover>

          <button
            onClick={onArchive}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
            title="Archivieren"
          >
            <Archive className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#FCCDD5] bg-[#FDE4E9] hover:bg-[#FDE4E9]/80"
          >
            <Trash2 className="h-4 w-4 text-[#F43F5E]" />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-xl font-semibold leading-snug">
            {thread.subject}
          </h2>

          {/* Sender header */}
          <div className="mt-6 flex items-start gap-3">
            <Avatar initials={initial} className="h-9 w-9 text-sm" />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{displayName}</span>
                  <Popover>
                    <PopoverTrigger className="cursor-pointer border-0 bg-transparent p-0 text-xs text-[#006FFE] hover:underline">
                      Details
                    </PopoverTrigger>
                    <PopoverContent
                      side="bottom"
                      align="start"
                      className="w-72 p-3"
                    >
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="flex gap-2">
                          <span className="w-12 shrink-0 text-muted-foreground">
                            Von
                          </span>
                          <span className="truncate font-medium">
                            {displayName} &lt;{thread.sender_email}&gt;
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="w-12 shrink-0 text-muted-foreground">
                            An
                          </span>
                          <span className="font-medium">{recipientLabel}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="w-12 shrink-0 text-muted-foreground">
                            Datum
                          </span>
                          <span className="font-medium">
                            {formatFullDate(thread.received_at)}
                          </span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(thread.received_at)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                An: {recipientLabel}
              </p>
            </div>
          </div>

          {/* Email body */}
          <div className="mt-5">
            {thread.body_html ? (
              <div
                className="prose prose-sm max-w-none overflow-hidden text-foreground [&_a]:text-[#006FFE] [&_a]:underline [&_img]:max-w-full [&_table]:max-w-full [&_pre]:overflow-x-auto"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(thread.body_html),
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {thread.body ?? thread.preview ?? ""}
              </pre>
            )}
          </div>

          {/* Conversation history */}
          {conversationMessages.length > 0 && (
            <div className="pb-6">
              {conversationMessages.map((msg) => {
                const msgName = getDisplayName(msg.sender_name, msg.sender_email);
                const msgInitial = getInitial(msg.sender_name, msg.sender_email);
                return (
                  <div key={msg.id} className="mt-6 border-t border-[#E7E7E7] pt-6">
                    <div className="flex items-start gap-3">
                      <Avatar initials={msgInitial} className="h-9 w-9 text-sm" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-sm font-semibold">{msgName}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(msg.received_at)}
                          </span>
                        </div>
                        <div className="mt-3">
                          {msg.body_html ? (
                            <div
                              className="prose prose-sm max-w-none overflow-hidden text-foreground [&_a]:text-[#006FFE] [&_a]:underline [&_img]:max-w-full"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body_html) }}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                              {msg.body ?? msg.preview ?? ""}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom: Reply buttons or composer */}
      <div className="shrink-0 ">
        {!replyMode ? (
          <div className="flex flex-wrap gap-2 px-6 py-3">
            {(
              [
                {
                  icon: <Reply className="h-4 w-4" />,
                  label: "Reply",
                  shortcut: "r",
                  action: () => setReplyMode("reply"),
                },
                {
                  icon: <ReplyAll className="h-4 w-4" />,
                  label: "Reply All",
                  shortcut: "a",
                  action: () => setReplyMode("replyAll"),
                },
                {
                  icon: <Forward className="h-4 w-4" />,
                  label: "Forward",
                  shortcut: "f",
                  action: () => {},
                },
              ] as const
            ).map(({ icon, label, shortcut, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center gap-2 rounded-lg border border-[#E7E7E7]  px-3 py-2 text-sm hover:bg-muted"
              >
                {icon}
                <span>{label}</span>
                <kbd className="rounded border border-[#E7E7E7] bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                  {shortcut}
                </kbd>
              </button>
            ))}
          </div>
        ) : (
          <ReplyComposer
            thread={thread}
            cc={
              replyMode === "replyAll" && thread.recipient_email
                ? [thread.recipient_email]
                : undefined
            }
            onClose={() => setReplyMode(null)}
            onAfterSend={handleAfterSend}
          />
        )}
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ onCompose }: { onCompose?: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image
          src="/empty-state-light.svg"
          alt="Keine Nachricht"
          width={200}
          height={200}
        />
        <div className="mt-4">
          <p className="text-base font-medium text-foreground">
            Hier ist es leer
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Wähle eine E-Mail aus oder
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              onClick={onCompose}
              className="rounded-lg border border-[#E7E7E7] bg-white px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              E-Mail senden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
