"use client";

import { type ReactElement, useRef, useState } from "react";
import { AlertTriangle, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Thread, Creator } from "../../types";
import { InsertTemplatePopover } from "../../templates/insert-template-popover";
import { useVariableSlashMenu } from "../../templates/variable-slash-menu";

export type ForwardContext = {
  brand?: string | null;
  contact?: string | null;
  title?: string | null;
  budget?: number | null;
  period?: string | null;
};

type Props = {
  thread: Thread;
  creators: Creator[];
  creatorId?: string | null;
  context?: ForwardContext;
  trigger?: ReactElement;
};

const EUR = (n: number | null | undefined) =>
  n != null ? n.toLocaleString("de-DE") + " €" : null;

const firstName = (full: string) => full.split(" ")[0] || full;

function buildSummary(name: string, thread: Thread, ctx: ForwardContext): string {
  const brand = ctx.brand || thread.sender_name || thread.sender_email;
  const lines = [
    `Hey ${name},`,
    "",
    `Anfrage von ${brand}${ctx.contact ? ` (${ctx.contact})` : ""}:`,
    `• Betreff: ${thread.subject}`,
  ];
  if (ctx.title) lines.push(`• Leistung: ${ctx.title}`);
  const budget = EUR(ctx.budget);
  if (budget) lines.push(`• Budget: ${budget}`);
  if (ctx.period) lines.push(`• Zeitraum: ${ctx.period}`);
  if (thread.preview) lines.push("", thread.preview.trim());
  lines.push(
    "",
    "Sag mir kurz, ob du grundsätzlich Interesse hast – dann kümmere ich mich um das Angebot.",
  );
  return lines.join("\n");
}

export function WhatsappForwardDialog({
  thread,
  creators,
  creatorId: initialCreatorId,
  context = {},
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creatorId, setCreatorId] = useState(initialCreatorId ?? "");
  const [message, setMessage] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const creator = creators.find((c) => c.id === creatorId) ?? null;
  const name = creator ? firstName(creator.full_name) : "Creator";

  const slashMenu = useVariableSlashMenu({
    mode: "resolve",
    resolveContext: { creatorId: creatorId || undefined },
    textareaRef: messageRef,
    onReplace: setMessage,
    onUnresolved: (paths) => setUnresolved((prev) => [...new Set([...prev, ...paths])]),
  });

  function summarize() {
    setMessage(buildSummary(name, thread, context));
    setAiUsed(true);
  }

  function send() {
    if (!message.trim()) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="secondary" className="w-full gap-1.5" />}>
          <MessageCircle className="h-3.5 w-3.5" />
          An {name} weiterleiten
        </DialogTrigger>
      )}

      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <DialogTitle className="text-sm">Per WhatsApp weiterleiten</DialogTitle>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
            WhatsApp
          </span>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>An:</span>
          <Select
            value={creatorId || ""}
            onValueChange={(v) => v !== null && setCreatorId(v)}
          >
            <SelectTrigger className="h-7 w-52 text-xs">
              <SelectValue placeholder="— Creator wählen —" />
            </SelectTrigger>
            <SelectContent>
              {creators.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="truncate">· {thread.subject}</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <InsertTemplatePopover
              channel="whatsapp"
              creatorId={creatorId || undefined}
              onInsert={(result) => {
                setMessage(result.body);
                setAiUsed(false);
                setUnresolved(result.unresolved);
              }}
              trigger={<span>Vorlage einfügen</span>}
            />
            <button
              type="button"
              onClick={summarize}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand/15"
            >
              <Sparkles className="h-3 w-3" />
              Eckdaten zusammenfassen
            </button>
          </div>

          {aiUsed && (
            <p className="rounded-lg bg-brand/10 px-3 py-2 text-xs text-brand">
              Vorschlag eingefügt – bitte gegenlesen, du sendest.
            </p>
          )}

          {unresolved.length > 0 && (
            <p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {unresolved.length}{" "}
              {unresolved.length === 1 ? "Variable konnte" : "Variablen konnten"}{" "}
              nicht aufgelöst werden ({unresolved.map((v) => `\${${v}}`).join(", ")})
            </p>
          )}

          <Textarea
            ref={messageRef}
            readOnly={slashMenu.loading}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setAiUsed(false);
              setUnresolved([]);
              slashMenu.handleChange(e);
            }}
            onKeyDown={(e) => {
              slashMenu.handleKeyDown(e);
            }}
            rows={9}
            placeholder="Nachricht an den Creator … oder / für Variablen, oben eine Vorlage wählen."
            className="min-h-44 text-sm"
          />
          {slashMenu.menu}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <span className="text-[11px] text-muted-foreground">
            Geht per WhatsApp an {name}.
          </span>
          <Button
            className="ml-auto gap-1.5"
            disabled={!message.trim()}
            onClick={send}
          >
            <Send className="h-3.5 w-3.5" />
            Per WhatsApp senden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
