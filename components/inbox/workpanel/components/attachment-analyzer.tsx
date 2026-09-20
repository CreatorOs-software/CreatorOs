"use client";

import { useState } from "react";
import { Paperclip, Loader2, Check, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@talentos/ui";
import type { Creator } from "../../types";

export type AttachmentExtractedFields = {
  creator_id: string | null;
  contact: string | null;
  title: string | null;
  product: string | null;
  budget: number | null;
  budget_offer: number | null;
  fee: number | null;
  period: string | null;
  campaign_start: string | null;
  campaign_end: string | null;
  notes: string | null;
  deliverables: {
    count: number;
    content_type: string;
    platform: string;
    draft_deadline: string | null;
    freigabe_deadline: string | null;
    live_date: string | null;
  }[];
  payment_items: {
    label: string;
    amount: number;
    invoice_date: string | null;
    payment_term: 14 | 30 | 45;
  }[];
  guidelines: {
    labeling: string | null;
    wording: string | null;
    nogo: string | null;
    hashtags: string[];
  } | null;
  tracking_assets: {
    discount_code: string | null;
    affiliate_links: string[];
    utm_params: string | null;
  } | null;
};

type AttachmentClassification = "RECHNUNG" | "VERTRAG_BRIEFING" | "ANDERES";

type AttachmentSummary = {
  id: string;
  filename: string;
  mimeType: string;
  classification: AttachmentClassification | null;
  classificationConfidence: number | null;
  assignedCreatorId: string | null;
};

type AttachmentAnalyzeResponse = {
  filename: string;
  classification: AttachmentClassification;
  classification_confidence: number;
  extracted: AttachmentExtractedFields | null;
};

type Props = {
  threadId: string;
  creators: Creator[];
  /** Called only for a VERTRAG_BRIEFING result with extracted fields — never for RECHNUNG/ANDERES. */
  onBriefingExtracted: (filename: string, extracted: AttachmentExtractedFields) => void;
};

// Self-contained: fetches its own eligible-attachments list (relevance +
// file-type already gated server-side) so it can be dropped into either the
// idle state or the post-"Analysieren" review form without prop-drilling.
export function AttachmentAnalyzer({ threadId, creators, onBriefingExtracted }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["inbox-attachments", threadId];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/inbox/${threadId}/attachments`);
      if (!res.ok) return { attachments: [] as AttachmentSummary[] };
      return res.json() as Promise<{ attachments: AttachmentSummary[] }>;
    },
  });
  const attachments = data?.attachments ?? [];

  const [showCards, setShowCards] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [creatorSelection, setCreatorSelection] = useState<Record<string, string>>({});

  // Session-fresh results overlay the persisted (server) state so a card
  // updates immediately without waiting for a refetch.
  const [localResults, setLocalResults] = useState<Record<string, { classification: AttachmentClassification }>>({});
  const [localAssignments, setLocalAssignments] = useState<Record<string, string>>({});

  const getResult = (a: AttachmentSummary) =>
    localResults[a.id] ?? (a.classification ? { classification: a.classification } : undefined);
  const getAssignedCreatorId = (a: AttachmentSummary) => localAssignments[a.id] ?? a.assignedCreatorId ?? undefined;

  async function handleAnalyzeAttachment(attachment: AttachmentSummary) {
    setAnalyzingId(attachment.id);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/inbox/${threadId}/attachments/${attachment.id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Anhang auslesen fehlgeschlagen");
      }
      const result = (await res.json()) as AttachmentAnalyzeResponse;
      setLocalResults((prev) => ({ ...prev, [attachment.id]: { classification: result.classification } }));
      if (result.classification === "VERTRAG_BRIEFING" && result.extracted) {
        onBriefingExtracted(result.filename, result.extracted);
      }
      void queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleAssignCreator(attachment: AttachmentSummary) {
    const creatorId = creatorSelection[attachment.id];
    if (!creatorId) return;
    setAssigningId(attachment.id);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/inbox/${threadId}/attachments/${attachment.id}/assign-creator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Zuordnen fehlgeschlagen");
      }
      setLocalAssignments((prev) => ({ ...prev, [attachment.id]: creatorId }));
      void queryClient.invalidateQueries({ queryKey });
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setAssigningId(null);
    }
  }

  if (attachments.length === 0) return null;

  return (
    <div className="mb-3">
      {!showCards ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCards(true)}
          className="w-full gap-1.5"
        >
          <Paperclip className="h-3 w-3" />
          Anhang mit KI auslesen
        </Button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {attachments.map((a) => {
            const result = getResult(a);
            const isAnalyzing = analyzingId === a.id;
            const isAssigning = assigningId === a.id;
            const assignedCreatorId = getAssignedCreatorId(a);
            const assignedCreator = assignedCreatorId
              ? creators.find((c) => c.id === assignedCreatorId)
              : null;

            if (!result) {
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => handleAnalyzeAttachment(a)}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 px-2 py-1.5 text-left text-[10px] hover:bg-muted disabled:opacity-60"
                >
                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{a.filename}</span>
                  {isAnalyzing ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="shrink-0 text-muted-foreground">auslesen</span>
                  )}
                </button>
              );
            }

            return (
              <div key={a.id} className="flex flex-col gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{a.filename}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {result.classification === "RECHNUNG"
                      ? "Rechnung erkannt"
                      : result.classification === "VERTRAG_BRIEFING"
                        ? "Vertrag/Briefing erkannt"
                        : "kein relevantes Dokument"}
                  </span>
                  {result.classification === "VERTRAG_BRIEFING" && (
                    <span className="flex shrink-0 items-center gap-1 text-emerald-600">
                      <Check className="h-3 w-3" />
                      übernommen
                    </span>
                  )}
                </div>

                {result.classification === "RECHNUNG" &&
                  (assignedCreator ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Check className="h-3 w-3" />
                      Zugeordnet zu {assignedCreator.full_name}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={creatorSelection[a.id] || undefined}
                        onValueChange={(v) => {
                          if (v !== null) {
                            setCreatorSelection((prev) => ({ ...prev, [a.id]: v }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-6 flex-1 text-[10px]">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!creatorSelection[a.id] || isAssigning}
                        onClick={() => handleAssignCreator(a)}
                        className="h-6 shrink-0 px-2 text-[10px]"
                      >
                        {isAssigning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : "Zuordnen"}
                      </Button>
                    </div>
                  ))}
              </div>
            );
          })}
          {analyzeError && <p className="text-xs text-destructive">{analyzeError}</p>}
        </div>
      )}
    </div>
  );
}
