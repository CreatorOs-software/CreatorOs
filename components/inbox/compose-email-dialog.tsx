"use client";

import { AlertTriangle, Command, Plus, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useVariableSlashMenu } from "./templates/variable-slash-menu";

// ─── Email tag input helpers ──────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(e: string) {
  return EMAIL_RE.test(e);
}

function EmailTagInput({
  label,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  tags: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(value: string) {
    const email = value.trim();
    if (!email) return;
    if (!isValidEmail(email)) return;
    if (!tags.includes(email)) onAdd(email);
    setInput("");
  }

  return (
    <div
      className="flex flex-1 flex-wrap items-center gap-1.5"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="shrink-0 text-sm font-medium text-[#8C8C8C]">{label}</span>
      {tags.map((email) => (
        <span
          key={email}
          className="flex items-center gap-1 rounded-full border border-[#DBDBDB] py-0.5 pl-2 pr-1 text-sm"
        >
          {email}
          <button
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onRemove(email); }}
            className="ml-0.5 text-[#8C8C8C] hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={tags.length === 0 ? "Enter email" : ""}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8C8C8C]"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " " || e.key === "Tab") && input.trim()) {
            e.preventDefault();
            commit(input);
          } else if (e.key === "Backspace" && !input && tags.length > 0) {
            onRemove(tags[tags.length - 1]!);
          }
        }}
        onBlur={() => commit(input)}
      />
    </div>
  );
}

// ─── ComposeEmailDialog ───────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationId?: string | null;
  initialTo?: string;
  initialSubject?: string;
};

export function ComposeEmailDialog({ open, onOpenChange, integrationId, initialTo = "", initialSubject = "" }: Props) {
  const [to, setTo] = useState<string[]>(initialTo ? [initialTo] : []);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const slashMenu = useVariableSlashMenu({
    mode: "resolve",
    resolveContext: { integrationId: integrationId ?? undefined },
    textareaRef: bodyRef,
    onReplace: setBody,
    onUnresolved: (paths) => setUnresolved((prev) => [...new Set([...prev, ...paths])]),
  });

  function handleClose() {
    onOpenChange(false);
    setTo(initialTo ? [initialTo] : []);
    setCc([]);
    setBcc([]);
    setShowCc(false);
    setShowBcc(false);
    setSubject(initialSubject);
    setBody("");
    setSendError(null);
  }

  async function handleSend() {
    if (to.length === 0 || !body.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/inbox/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.join(", "), cc: cc.join(", "), bcc: bcc.join(", "), subject, body, integrationId }),
      });
      if (!res.ok) throw new Error("Fehler beim Senden");
      toast.success("E-Mail erfolgreich versendet");
      handleClose();
    } catch {
      setSendError("E-Mail konnte nicht gesendet werden");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
    >
      <div className="flex w-full max-w-187.5 flex-col gap-2 px-4">
        {/* esc button */}
        <div className="flex justify-start">
          <button
            onClick={handleClose}
            className="flex items-center gap-1 rounded-lg bg-[#F0F0F0] px-2 py-1.5"
          >
            <X className="h-3.5 w-3.5 text-[#6D6D6D]" />
            <span className="text-sm font-medium text-[#6D6D6D]">esc</span>
          </button>
        </div>

        {/* Composer card */}
        <div className="overflow-hidden rounded-2xl border border-[#E7E7E7] bg-[#FAFAFA] shadow-lg">

          {/* To */}
          <div className="flex items-center gap-2 border-b border-[#E7E7E7] px-3 py-3">
            <EmailTagInput
              label="To:"
              tags={to}
              onAdd={(e) => setTo((p) => [...p, e])}
              onRemove={(e) => setTo((p) => p.filter((x) => x !== e))}
            />
            <div className="flex shrink-0 gap-2 text-sm font-medium text-[#8C8C8C]">
              <button className={cn("hover:text-foreground", showCc && "text-foreground")} onClick={() => { setShowCc((v) => !v); if (showCc) setCc([]); }}>Cc</button>
              <button className={cn("hover:text-foreground", showBcc && "text-foreground")} onClick={() => { setShowBcc((v) => !v); if (showBcc) setBcc([]); }}>Bcc</button>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="border-b border-[#E7E7E7] px-3 py-2">
              <EmailTagInput
                label="Cc:"
                tags={cc}
                onAdd={(e) => setCc((p) => [...p, e])}
                onRemove={(e) => setCc((p) => p.filter((x) => x !== e))}
              />
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="border-b border-[#E7E7E7] px-3 py-2">
              <EmailTagInput
                label="Bcc:"
                tags={bcc}
                onAdd={(e) => setBcc((p) => [...p, e])}
                onRemove={(e) => setBcc((p) => p.filter((x) => x !== e))}
              />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2 border-b border-[#E7E7E7] px-3 py-3">
            <span className="shrink-0 text-sm font-medium text-[#8C8C8C]">Subject:</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Re: Design review feedback"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#8C8C8C]"
            />
            <button title="Betreff generieren" className="shrink-0 text-[#8C8C8C] hover:text-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Unresolved variable warning */}
          {unresolved.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {unresolved.length}{" "}
              {unresolved.length === 1 ? "Variable konnte" : "Variablen konnten"}{" "}
              nicht aufgelöst werden ({unresolved.map((v) => `\${${v}}`).join(", ")})
            </div>
          )}

          {/* Body */}
          <div className="min-h-55 bg-white px-3 py-3">
            <textarea
              ref={bodyRef}
              autoFocus
              readOnly={slashMenu.loading}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                slashMenu.handleChange(e);
              }}
              onKeyDown={(e) => {
                if (slashMenu.handleKeyDown(e)) return;
                if (e.key === "Enter" && e.metaKey) void handleSend();
              }}
              placeholder="Nachricht schreiben… (/ für Variablen)"
              className="h-full min-h-55 w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#8C8C8C]"
            />
            {slashMenu.menu}
          </div>

          {/* Bottom actions */}
          <div className="flex flex-col gap-1 bg-white px-3 py-3">
          {sendError && (
            <p className="text-xs text-red-500">{sendError}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Send */}
              <button
                onClick={() => void handleSend()}
                disabled={sending || to.length === 0 || !body.trim()}
                className="flex h-7 cursor-pointer items-center gap-1 rounded-md bg-black pl-2 pr-1 text-sm text-white disabled:opacity-50"
              >
                <span>Send</span>
                <span className="flex h-5 items-center gap-0.5 rounded-sm bg-white/10 px-1">
                  <Command className="h-3 w-3" />
                  <span className="text-xs">↩</span>
                </span>
              </button>

              {/* Add attachment (stub) */}
              <button className="flex h-7 items-center gap-0.5 rounded-md border border-[#E7E7E7] bg-white px-2 text-sm text-[#6D6D6D] hover:bg-muted">
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Generate (stub) */}
            <button className="flex h-7 items-center gap-1.5 rounded-md border border-[#8B5CF6] px-2 text-sm text-foreground hover:bg-muted">
              <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" />
              <span>Generate</span>
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
