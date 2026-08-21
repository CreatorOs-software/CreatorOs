"use client";

import DOMPurify from "dompurify";
import Image from "next/image";
import {
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Forward,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Reply,
  ReplyAll,
  Star,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Thread } from "./types";
import type { EmailLabel } from "@/domains/communication";
import { SYSTEM_LABELS } from "./constants";
import {
  formatDate,
  formatFullDate,
  getDisplayName,
  getInitial,
  getSenderColor,
} from "./utils";

// ─── Chip templates ───────────────────────────────────────────────────────────

type ChipKind =
  | "interesse"
  | "gegenangebot"
  | "rueckfragen"
  | "absage"
  | "creator";

const CHIPS: { id: ChipKind; label: string }[] = [
  { id: "interesse", label: "Interesse + Mediakit" },
  { id: "gegenangebot", label: "Gegenangebot" },
  { id: "rueckfragen", label: "Rückfragen" },
  { id: "absage", label: "Freundliche Absage" },
  { id: "creator", label: "An Creator weiterleiten" },
];

function getChipReply(kind: ChipKind, thread: Thread): string {
  const first =
    getDisplayName(thread.sender_name, thread.sender_email).split(" ")[0] ??
    "there";
  switch (kind) {
    case "interesse":
      return `Hallo ${first},\n\nvielen Dank für Ihre Anfrage – grundsätzlich können wir uns eine Zusammenarbeit gut vorstellen, das Thema passt inhaltlich sehr gut.\n\nAnbei unser aktuelles Mediakit mit Reichweiten und Referenzen. Für das beschriebene Paket würden wir bei ca. 5.500 € netto einsteigen, inkl. der üblichen Nutzungsrechte (organisch, 6 Monate DACH). Paid-Nutzung und Exklusivität besprechen wir separat.\n\nPasst das als Grundlage?\n\nBeste Grüße`;
    case "gegenangebot":
      return `Hallo ${first},\n\ndanke für euer Angebot. Für den beschriebenen Umfang liegen wir bei 5.800 € netto – die Produktion ist deutlich aufwendiger als ein reiner Story-Slot.\n\nAlternativ können wir beim genannten Budget bleiben und das Paket entsprechend anpassen.\n\nSagt gern, welche Variante euch lieber wäre.\n\nBeste Grüße`;
    case "rueckfragen":
      return `Hallo ${first},\n\ndanke für die Anfrage. Bevor ich ein konkretes Angebot schicke, zwei kurze Rückfragen:\n\n1. In welchem Zeitraum soll der Content live gehen?\n2. Ist eine Paid-Nutzung (Whitelisting/Ads) geplant, und wenn ja, für wie lange?\n\nDanach kommt das Angebot zeitnah.\n\nBeste Grüße`;
    case "absage":
      return `Hallo ${first},\n\nvielen Dank für das Interesse. Leider passt es aktuell nicht – im genannten Zeitraum besteht bereits eine Kooperation in derselben Kategorie.\n\nMeldet euch gerne zu einem späteren Zeitpunkt.\n\nBeste Grüße`;
    case "creator":
      return `Hey,\n\nAnfrage reingekommen: ${thread.sender_name ?? thread.sender_email} – Betreff: ${thread.subject}.\n\nSag mir kurz Bescheid ob du grundsätzlich Interesse hast – dann mache ich das Angebot fertig.\n\nLG`;
  }
}

// ─── SaveTemplateDialog ───────────────────────────────────────────────────────

function SaveTemplateDialog({ body }: { body: string }) {
  const [title, setTitle] = useState("");

  function handleSave() {
    if (!title.trim()) return;
    // TODO: persist to DB
    console.log("Template saved:", { title, body });
    setTitle("");
  }

  return (
    <Dialog>
      <DialogTrigger
        disabled={!body.trim()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FileText className="h-3.5 w-3.5" />
        Vorlage
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Als Vorlage speichern</DialogTitle>
          <DialogDescription>
            Gib der Vorlage einen Namen damit du sie später schnell wiederfinden
            kannst.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="z. B. Interesse + Mediakit"
            className="h-9 w-full rounded-lg bg-muted px-3 text-sm outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <div className="line-clamp-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {body}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <DialogClose className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            Abbrechen
          </DialogClose>
          <DialogClose
            onClick={handleSave}
            disabled={!title.trim()}
            className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
          >
            Speichern
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const [usedChip, setUsedChip] = useState(false);
  const [sending, setSending] = useState(false);

  function applyChip(kind: ChipKind) {
    setReply(getChipReply(kind, thread));
    setUsedChip(true);
  }

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

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#E7E7E7] px-4 py-2.5">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => applyChip(chip.id)}
            className="flex items-center gap-1 rounded-full border border-[#E7E7E7] px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Zap className="h-3 w-3 text-[#8B5CF6]" />
            {chip.label}
          </button>
        ))}
      </div>

      {/* AI hint */}
      {usedChip && (
        <div className="flex items-center gap-2 border-b border-[#E7E7E7] bg-[#F3EDFE] px-4 py-2 text-xs font-medium text-[#6829D4]">
          <Zap className="h-3 w-3" />
          Vorschlag eingefügt – bitte gegenlesen, du sendest.
        </div>
      )}

      {/* Textarea */}
      <textarea
        autoFocus
        value={reply}
        onChange={(e) => {
          setReply(e.target.value);
          if (!e.target.value) setUsedChip(false);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSend();
        }}
        placeholder="Antwort schreiben … oder oben einen Vorschlag wählen."
        className="min-h-32 w-full resize-none bg-transparent px-4 py-3 text-sm outline-none"
      />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#E7E7E7] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <Paperclip className="h-3.5 w-3.5" />
            Mediakit anhängen
          </button>
          <SaveTemplateDialog body={reply} />
        </div>
        <button
          disabled={!reply.trim() || sending}
          onClick={handleSend}
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background disabled:opacity-40"
        >
          {sending && <Loader2 className="h-3 w-3 animate-spin" />}
          {sending ? "Senden…" : "Senden"}
        </button>
      </div>
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
}: EmailDetailPanelProps) {
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | null>(null);

  const displayName = getDisplayName(thread.sender_name, thread.sender_email);
  const initial = getInitial(thread.sender_name, thread.sender_email);
  const avatarColor = getSenderColor(thread.sender_email);

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

          {/* Summary / preview box */}
          {thread.preview && (
            <div className="mt-4 rounded-lg border border-[#006FFE]/30 bg-[#006FFE]/5 p-3">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#006FFE]">
                Vorschau
              </p>
              <p className="text-sm text-muted-foreground">{thread.preview}</p>
            </div>
          )}

          {/* Sender header */}
          <div className="mt-6 flex items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </div>
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
          <div className="mt-5 pb-6">
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
            onAfterSend={onAfterSend}
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
            <button
              disabled
              className="cursor-not-allowed rounded-lg border border-[#E7E7E7] bg-white px-4 py-2 text-sm text-muted-foreground opacity-50"
            >
              Letzte 50 E-Mails labeln
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
