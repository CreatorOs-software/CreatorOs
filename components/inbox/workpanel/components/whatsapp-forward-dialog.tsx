"use client";

import { type ReactElement, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Thread, Creator } from "../../types";

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

function templates(name: string, thread: Thread, ctx: ForwardContext) {
  const brand = ctx.brand || thread.sender_name || "einer Brand";
  return [
    {
      value: "anfrage",
      label: "Anfrage weiterleiten",
      build: () =>
        `Hey ${name},\n\nneue Anfrage von ${brand} reingekommen. Sag kurz Bescheid, ob das grundsätzlich für dich passt.`,
    },
    {
      value: "nachfrage",
      label: "Kurz nachfragen",
      build: () =>
        `Hey ${name},\n\nkurze Rückfrage zu ${brand}: Wie sieht es zeitlich bei dir aus?`,
    },
    {
      value: "feedback",
      label: "Feedback weitergeben",
      build: () =>
        `Hey ${name},\n\nFeedback von ${brand} ist da:\n\n– \n\nSchaffst du das bis Ende der Woche?`,
    },
  ];
}

export function WhatsappForwardPopover({
  thread,
  creators,
  creatorId: initialCreatorId,
  context = {},
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creatorId, setCreatorId] = useState(initialCreatorId ?? "");
  const [message, setMessage] = useState("");

  const creator = creators.find((c) => c.id === creatorId) ?? null;
  const name = creator ? firstName(creator.full_name) : "Creator";
  const tpls = templates(name, thread, context);

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
    <Popover open={open} onOpenChange={setOpen}>
      {trigger ? (
        <PopoverTrigger render={trigger} />
      ) : (
        <PopoverTrigger render={<Button variant="secondary" className="w-full gap-1.5" />}>
          <MessageCircle className="h-3.5 w-3.5" />
          An {name} weiterleiten
        </PopoverTrigger>
      )}

      <PopoverContent align="start" className="w-80 gap-3">
        <div>
          <p className="text-sm font-medium">Per WhatsApp an Creator</p>
          <p className="text-xs text-muted-foreground">
            Zusammenfassung der Mail an den Creator schicken.
          </p>
        </div>

        <Select
          value={creatorId || ""}
          onValueChange={(v) => v !== null && setCreatorId(v)}
        >
          <SelectTrigger className="w-full">
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

        <div className="flex flex-wrap gap-1.5">
          {tpls.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setMessage(t.build())}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {t.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setMessage(buildSummary(name, thread, context))}
        >
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Eckdaten zusammenfassen
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={7}
          placeholder="Nachricht an den Creator … oder Vorlage wählen."
          className="text-sm"
        />

        <Button className="w-full gap-1.5" disabled={!message.trim()} onClick={send}>
          <Send className="h-3.5 w-3.5" />
          Per WhatsApp senden
        </Button>
      </PopoverContent>
    </Popover>
  );
}
