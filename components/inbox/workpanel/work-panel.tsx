"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Thread, Integration, Creator } from "../types";
import type { WorkPanelState, ExtractedEmailData } from "./types";
import { IdlePanel } from "./components/idle-panel";
import { ScanningPanel } from "./components/scanning-panel";
import { NotCoopPanel } from "./components/not-coop-panel";
import { NewBrandPanel } from "./components/new-brand-panel";
import { ExtractedPanel } from "./components/extracted-panel";
import { VorgangPanel } from "./components/vorgang-panel";
import {
  WhatsappForwardDialog,
  type ForwardContext,
} from "./components/whatsapp-forward-dialog";
import type { AnalyseResult } from "@/app/api/inbox/[id]/analyse/route";

function forwardContextFromState(state: WorkPanelState): {
  creatorId: string | null;
  context: ForwardContext;
} {
  if (state.phase === "extracted") {
    const d = state.data;
    return {
      creatorId: d.creatorId,
      context: {
        brand: d.brand,
        contact: d.contact,
        title: d.deliverables
          .map((x) => `${x.count}x ${x.content_type}`)
          .join(" + "),
        budget: d.budget,
        period: d.period,
      },
    };
  }
  if (state.phase === "vorgang") {
    const v = state.vorgang;
    return {
      creatorId: v.creatorId,
      context: { brand: v.brand, title: v.title, budget: v.honorar },
    };
  }
  return { creatorId: null, context: {} };
}

const EMPTY_EXTRACTED: ExtractedEmailData = {
  brand: "",
  contact: "",
  creatorId: null,
  creatorConfidence: 0,
  title: "",
  product: "",
  budget: null,
  budgetOffer: null,
  fee: null,
  period: "",
  campaign_start: "",
  campaign_end: "",
  notes: "",
  deliverables: [],
  paymentItems: [],
  guidelines: { labeling: "", wording: "", nogo: "", hashtags: [] },
  trackingAssets: { discountCode: "", affiliateLinks: [], utmParams: "" },
  uncertainFields: [],
  detectedFields: [],
};

async function runAnalyse(
  threadId: string,
  mode: "create" | "merge",
  anfrageId?: string,
): Promise<WorkPanelState> {
  const res = await fetch(`/api/inbox/${threadId}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`Analyse fehlgeschlagen (${res.status}): ${text}`);
  }
  const data = await res.json() as AnalyseResult;

  const aiDeliverables = (data.deliverables ?? []).map((d) => ({
    count:             d.count,
    content_type:      d.content_type,
    platform:          d.platform,
    draft_deadline:    d.draft_deadline ?? "",
    freigabe_deadline: d.freigabe_deadline ?? "",
    live_date:         d.live_date ?? "",
  }));

  const g = data.guidelines;
  const t = data.tracking_assets;
  const paymentItems = (data.payment_items ?? []).map((p) => ({
    label:       p.label,
    amount:      p.amount,
    invoiceDate: p.invoice_date ?? "",
    paymentTerm: p.payment_term,
  }));

  const guidelines = {
    labeling: g?.labeling ?? "",
    wording:  g?.wording ?? "",
    nogo:     g?.nogo ?? "",
    hashtags: g?.hashtags ?? [],
  };
  const trackingAssets = {
    discountCode:   t?.discount_code ?? "",
    affiliateLinks: t?.affiliate_links ?? [],
    utmParams:      t?.utm_params ?? "",
  };
  const guidelinesDetected = !!(g && (g.labeling || g.wording || g.nogo || (g.hashtags?.length ?? 0) > 0));
  const trackingDetected = !!(t && (t.discount_code || t.utm_params || (t.affiliate_links?.length ?? 0) > 0));

  const extractedData = {
    brand:             data.brand_name ?? "",
    contact:           data.contact ?? "",
    creatorId:         data.creator_id,
    creatorConfidence: data.creator_confidence,
    title:             data.title ?? "",
    product:           data.product ?? "",
    budget:            data.budget,
    budgetOffer:       data.budget_offer,
    fee:               data.fee,
    period:            data.period ?? "",
    campaign_start:    data.campaign_start ?? "",
    campaign_end:      data.campaign_end ?? "",
    notes:             data.notes ?? "",
    deliverables:      aiDeliverables,
    paymentItems,
    guidelines,
    trackingAssets,
    uncertainFields:   [
      ...(!data.creator_id            ? ["creatorId"]    : []),
      ...(!data.product              ? ["product"]      : []),
      ...(data.budget == null        ? ["budget"]       : []),
      ...(!data.period              ? ["period"]       : []),
      ...(aiDeliverables.length === 0 ? ["deliverables"] : []),
    ],
    detectedFields:    [
      ...(data.brand_name != null         ? ["brand"]          : []),
      ...(data.creator_id != null         ? ["creatorId"]      : []),
      ...(data.contact?.trim()            ? ["contact"]        : []),
      ...(data.title?.trim()              ? ["title"]          : []),
      ...(data.product?.trim()            ? ["product"]        : []),
      ...(data.budget != null             ? ["budget"]         : []),
      ...(data.budget_offer != null       ? ["budgetOffer"]    : []),
      ...(data.fee != null                ? ["fee"]            : []),
      ...(data.period?.trim()             ? ["period"]         : []),
      ...(data.campaign_start?.trim() || data.campaign_end?.trim() ? ["campaign"] : []),
      ...(data.notes?.trim()              ? ["notes"]          : []),
      ...(aiDeliverables.length > 0       ? ["deliverables"]   : []),
      ...(paymentItems.length > 0         ? ["paymentItems"]   : []),
      ...(guidelinesDetected              ? ["guidelines"]     : []),
      ...(trackingDetected                ? ["trackingAssets"] : []),
    ],
  };

  if (mode === "merge") {
    const id = anfrageId ?? data.anfrage_id;
    if (!id) throw new Error("Keine verknüpfte Anfrage gefunden");
    return { phase: "extracted", data: extractedData, merge: { anfrageId: id } };
  }

  if (data.brand_is_new) {
    return {
      phase: "new-brand",
      newBrand: {
        brand_name:    data.brand_name ?? "",
        industry:      null,
        extractedData,
      },
    };
  }

  return { phase: "extracted", data: extractedData };
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  selected: Thread | null;
  open: boolean;
  /** Width in px when open. Controlled by the drag handle in OrbitInbox. */
  width?: number;
  /** Suppresses the width transition while the user drags the handle. */
  resizing?: boolean;
  integrations: Integration[];
  creators: Creator[];
  workState: WorkPanelState;
  analyseCount: number;
  vorgangCount: number;
  onToggle: () => void;
  onSetWorkState: (state: WorkPanelState) => void;
  onPatch: (id: string, patch: Partial<Thread>) => void;
};

const COLLAPSED_WIDTH = 40;
const DEFAULT_WIDTH = 320;

// ─── WorkPanel ────────────────────────────────────────────────────────────────

export function WorkPanel({
  selected,
  open,
  width = DEFAULT_WIDTH,
  resizing = false,
  creators,
  workState,
  analyseCount,
  vorgangCount,
  onToggle,
  onSetWorkState,
}: Props) {
  const [analyseError, setAnalyseError] = useState<string | null>(null);

  useEffect(() => {
    if (workState.phase !== "scanning" || !selected) return;
    setAnalyseError(null);
    let cancelled = false;
    runAnalyse(selected.id, workState.mode, workState.anfrageId).then((state) => {
      if (!cancelled) onSetWorkState(state);
    }).catch((err: unknown) => {
      console.error("[WorkPanel] runAnalyse failed:", err);
      if (!cancelled) {
        setAnalyseError(err instanceof Error ? err.message : "Unbekannter Fehler");
        onSetWorkState({ phase: "idle" });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workState.phase, selected?.id]);

  const ctxLabel =
    !selected ? "—"
    : workState.phase === "idle" ? "neu"
    : workState.phase === "scanning" ? "liest…"
    : workState.phase === "not-coop" ? "ignoriert"
    : workState.phase === "new-brand" ? "Neue Brand"
    : workState.phase === "extracted" ? "Entwurf"
    : "Vorgang";

  return (
    <div
      style={{ width: open ? width : COLLAPSED_WIDTH }}
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card",
        !resizing && "transition-[width] duration-300",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-border px-3 py-3",
          open ? "gap-2" : "justify-center",
        )}
      >
        <Button variant="ghost" size="icon-sm" onClick={onToggle}>
          {open ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
        {open && (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Work Panel
            </span>
            <Badge variant="secondary" className="ml-auto">
              {ctxLabel}
            </Badge>
          </>
        )}
      </div>

      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {selected && workState.phase !== "idle" && (
            <button
              onClick={() => onSetWorkState({ phase: "idle" })}
              className="mb-3 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" />
              Zurück
            </button>
          )}
          {!selected && (
            <p className="pt-8 text-center text-xs text-muted-foreground">
              Keine Nachricht ausgewählt
            </p>
          )}
          {selected && workState.phase === "idle" && analyseError && (
            <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2.5 text-xs leading-relaxed text-destructive">
              <p className="mb-1 font-semibold">Analyse fehlgeschlagen</p>
              <p className="opacity-80">{analyseError}</p>
            </div>
          )}
          {selected && workState.phase === "idle" && (
            <IdlePanel
              labels={selected.system_labels ?? []}
              anfrageId={selected.anfrage_id}
              dealId={selected.deal_id}
              onAnalyse={() => onSetWorkState({ phase: "scanning", mode: "create" })}
              onReanalyse={
                selected.anfrage_id
                  ? () =>
                      onSetWorkState({
                        phase: "scanning",
                        mode: "merge",
                        anfrageId: selected.anfrage_id ?? undefined,
                      })
                  : undefined
              }
              onNotCoop={() => onSetWorkState({ phase: "not-coop" })}
              onManualCreate={() =>
                onSetWorkState({ phase: "extracted", data: { ...EMPTY_EXTRACTED } })
              }
            />
          )}
          {selected && workState.phase === "scanning" && <ScanningPanel />}
          {selected && workState.phase === "not-coop" && <NotCoopPanel />}
          {selected && workState.phase === "new-brand" && (
            <NewBrandPanel
              newBrand={workState.newBrand}
              senderEmail={selected.sender_email}
              senderName={selected.sender_name}
              onSetWorkState={onSetWorkState}
            />
          )}
          {selected && workState.phase === "extracted" && (
            <ExtractedPanel
              data={workState.data}
              creators={creators}
              threadId={selected.id}
              merge={workState.merge}
              onSetWorkState={onSetWorkState}
            />
          )}
          {selected && workState.phase === "vorgang" && (
            <VorgangPanel
              vorgang={workState.vorgang}
              creators={creators}
              thread={selected}
              onSetWorkState={onSetWorkState}
            />
          )}
        </div>
      )}

      {open && selected && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <WhatsappForwardDialog
            key={selected.id}
            thread={selected}
            creators={creators}
            {...forwardContextFromState(workState)}
          />
        </div>
      )}

      {open && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border px-4 py-2">
          <p className="text-[11px] text-muted-foreground">KI heute:</p>
          <Badge variant="secondary">{analyseCount} Analysen</Badge>
          <Badge variant="secondary">{vorgangCount} Vorgänge</Badge>
        </div>
      )}
    </div>
  );
}
