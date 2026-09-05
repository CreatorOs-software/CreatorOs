"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QueryKeys } from "@/lib/query-keys";
import type { RenderResult, Template, TemplateChannel } from "@/domains/templates";
import { InsertTemplatePopover } from "./insert-template-popover";

type Props = {
  channel: TemplateChannel;
  threadId?: string;
  creatorId?: string;
  brandId?: string;
  onInsert: (result: RenderResult) => void;
  /** Above this many matching templates, collapse the chips into the dropdown. */
  maxChips?: number;
  className?: string;
};

/**
 * Templates for a channel shown as quick-insert chips above a composer.
 * Falls back to the {@link InsertTemplatePopover} dropdown once there are
 * more than `maxChips` templates. Renders nothing while loading / when the
 * channel has no templates.
 */
export function TemplateQuickInsert({
  channel,
  threadId,
  creatorId,
  brandId,
  onInsert,
  maxChips = 4,
  className,
}: Props) {
  const [renderingId, setRenderingId] = useState<string | null>(null);

  const { data } = useQuery<{ templates: Template[] }>({
    queryKey: QueryKeys.templates.list(),
    queryFn: () => fetch("/api/templates").then((r) => r.json()),
    staleTime: 60_000,
  });

  const templates = (data?.templates ?? []).filter(
    (t) => t.channel === channel || t.channel === "general",
  );

  if (templates.length === 0) return null;

  if (templates.length > maxChips) {
    return (
      <div className={className}>
        <InsertTemplatePopover
          channel={channel}
          threadId={threadId}
          creatorId={creatorId}
          brandId={brandId}
          onInsert={onInsert}
        />
      </div>
    );
  }

  async function pick(t: Template) {
    setRenderingId(t.id);
    try {
      const res = await fetch(`/api/templates/${t.id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, creatorId, brandId }),
      });
      if (!res.ok) return;
      onInsert((await res.json()) as RenderResult);
    } finally {
      setRenderingId(null);
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => pick(t)}
          disabled={renderingId !== null}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
        >
          {renderingId === t.id && <Loader2 className="h-3 w-3 animate-spin" />}
          {t.name}
        </button>
      ))}
    </div>
  );
}
