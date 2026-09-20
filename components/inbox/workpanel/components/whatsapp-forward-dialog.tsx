"use client";

import { type ReactElement, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import { normalizeE164 } from "@/lib/formatters";
import type { WhatsAppConnectionPublic, WhatsAppTemplate } from "@/domains/whatsapp/types";
import type { Thread, Creator } from "../../types";
import { TemplateQuickInsert } from "../../templates/template-quick-insert";
import { useVariableSlashMenu } from "../../templates/variable-slash-menu";
import { VariablePicker } from "../../templates/variable-picker";

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
  const [sending, setSending] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const { data: connData } = useQuery<{ connection: WhatsAppConnectionPublic }>({
    queryKey: QueryKeys.whatsapp.connection(),
    queryFn: () => fetch("/api/admin/whatsapp").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  const connected = connData?.connection?.connected === true;
  const { data: templateData } = useQuery<{ templates: WhatsAppTemplate[] }>({
    queryKey: QueryKeys.whatsapp.templates(),
    queryFn: async () => {
      const response = await fetch("/api/admin/whatsapp?action=templates");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Vorlagen konnten nicht geladen werden");
      return body;
    },
    enabled: connected,
  });
  const templates = templateData?.templates ?? [];
  const selectedTemplate = templates.find((template) => template.name === templateName) ?? null;

  const creator = creators.find((c) => c.id === creatorId) ?? null;
  const name = creator ? firstName(creator.full_name) : "Creator";
  const phoneValid = !!normalizeE164(creator?.phone ?? null);

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

  async function send() {
    if (!message.trim() || !creator || !phoneValid || !connected || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: creator.id,
          threadId: thread.id,
          body: message.trim(),
          templateName: selectedTemplate?.name,
          templateParams:
            selectedTemplate?.bodyParamCount === 1 ? [message.trim()] : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Senden fehlgeschlagen");
        return;
      }
      toast.success(`WhatsApp an Meta übergeben. Zustellung wird nachgeführt.`);
      setOpen(false);
      setMessage("");
      setAiUsed(false);
    } finally {
      setSending(false);
    }
  }

  const templateSupported = !selectedTemplate || selectedTemplate.bodyParamCount <= 1;
  const hasContent = selectedTemplate?.bodyParamCount === 0 || !!message.trim();
  const canSend = hasContent && templateSupported && !!creator && phoneValid && connected && !sending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" className="w-full gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            An {name} weiterleiten
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-describedby={undefined}
      >
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
          <TemplateQuickInsert
            channel="whatsapp"
            creatorId={creatorId || undefined}
            onInsert={(result) => {
              setMessage(result.body);
              setAiUsed(false);
              setUnresolved(result.unresolved);
            }}
          />
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium">Meta-Vorlage für Nachrichten außerhalb des 24-Stunden-Fensters</span>
              <Select value={templateName || "__freeform"} onValueChange={(value) => setTemplateName(value === "__freeform" || value === null ? "" : value)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__freeform">Freie Antwort im Servicefenster</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.name}>
                      {template.name} · {template.language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && selectedTemplate.bodyParamCount > 1 && (
                <p className="text-xs text-destructive">Diese Vorlage benötigt {selectedTemplate.bodyParamCount} Parameter und wird in diesem Dialog noch nicht unterstützt.</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <VariablePicker onPick={slashMenu.insertVariable} />
            <Button
              type="button"
              variant="ghost"
              onClick={summarize}
              className="h-auto gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/15"
            >
              <Sparkles className="h-3 w-3" />
              Eckdaten zusammenfassen
            </Button>
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
              setError(null);
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
          <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : creator && !phoneValid ? (
              <>
                Für {creator.full_name} ist keine WhatsApp-Nummer hinterlegt.{" "}
                <Link
                  href={`/creators/edit-form/${creator.id}`}
                  className="underline hover:text-foreground"
                >
                  Nummer ergänzen
                </Link>
              </>
            ) : !connected ? (
              <>
                Kein WhatsApp-Absender verbunden.{" "}
                <Link
                  href="/admin/settings/integrations"
                  className="underline hover:text-foreground"
                >
                  In den Einstellungen verbinden
                </Link>
              </>
            ) : (
              <>Geht per WhatsApp an {name}.</>
            )}
          </span>
          <Button className="gap-1.5" disabled={!canSend} onClick={send}>
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sending ? "Sendet…" : "Per WhatsApp senden"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
