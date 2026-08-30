"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { QueryKeys } from "@/lib/query-keys";
import type { RenderResult, Template, TemplateChannel } from "@/domains/templates";

type Props = {
  channel: TemplateChannel;
  threadId?: string;
  creatorId?: string;
  brandId?: string;
  onInsert: (result: RenderResult) => void;
  trigger?: ReactNode;
};

export function InsertTemplatePopover({
  channel,
  threadId,
  creatorId,
  brandId,
  onInsert,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [renderingId, setRenderingId] = useState<string | null>(null);

  const { data } = useQuery<{ templates: Template[] }>({
    queryKey: QueryKeys.templates.list(),
    queryFn: () => fetch("/api/templates").then((r) => r.json()),
    staleTime: 60_000,
    enabled: open,
  });

  const templates = (data?.templates ?? []).filter(
    (t) => t.channel === channel || t.channel === "general",
  );

  async function pick(template: Template) {
    setRenderingId(template.id);
    try {
      const res = await fetch(`/api/templates/${template.id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, creatorId, brandId }),
      });
      if (!res.ok) return;
      const result: RenderResult = await res.json();
      onInsert(result);
      setOpen(false);
    } finally {
      setRenderingId(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {trigger ?? (
          <>
            <FileText className="h-3.5 w-3.5" />
            Vorlage
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="max-h-72 overflow-y-auto py-1">
          {templates.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Keine Vorlagen für diesen Kanal.
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t)}
                disabled={renderingId !== null}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {t.name}
                {renderingId === t.id && <Loader2 className="h-3 w-3 animate-spin" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
