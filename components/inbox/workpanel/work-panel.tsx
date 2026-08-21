"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Thread, Integration, Creator } from "../types";
import type { WorkPanelState } from "./types";
import { IdlePanel } from "./components/idle-panel";
import { ScanningPanel } from "./components/scanning-panel";
import { NotCoopPanel } from "./components/not-coop-panel";
import { ExtractedPanel } from "./components/extracted-panel";
import { VorgangPanel } from "./components/vorgang-panel";

// ─── AI simulation ────────────────────────────────────────────────────────────

function buildExtracted(thread: Thread): WorkPanelState {
  const domainRaw = thread.sender_email.split("@")[1] ?? "";
  const domain = domainRaw.replace(/\.(de|com|net|org|io)$/, "");
  const brand =
    thread.sender_name ?? domain.charAt(0).toUpperCase() + domain.slice(1);

  const budgetMatch = thread.body?.match(/(\d[\d.]{2,})\s?€/);
  const budget = budgetMatch
    ? parseFloat(budgetMatch[1]!.replace(/\./g, ""))
    : null;

  return {
    phase: "extracted",
    data: {
      brand,
      contact: thread.sender_name ?? thread.sender_email,
      creatorId: null,
      creatorConfidence: 0,
      format: "",
      product: "",
      budget,
      period: "",
      uncertainFields: [
        "creatorId",
        "format",
        "product",
        "period",
        ...(budget ? [] : ["budget"]),
      ],
    },
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  selected: Thread | null;
  open: boolean;
  integrations: Integration[];
  creators: Creator[];
  workState: WorkPanelState;
  analyseCount: number;
  vorgangCount: number;
  onToggle: () => void;
  onSetWorkState: (state: WorkPanelState) => void;
  onPatch: (id: string, patch: Partial<Thread>) => void;
};

// ─── WorkPanel ────────────────────────────────────────────────────────────────

export function WorkPanel({
  selected,
  open,
  creators,
  workState,
  analyseCount,
  vorgangCount,
  onToggle,
  onSetWorkState,
}: Props) {
  useEffect(() => {
    if (workState.phase !== "scanning" || !selected) return;
    const t = setTimeout(() => onSetWorkState(buildExtracted(selected)), 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workState.phase, selected?.id]);

  const ctxLabel =
    !selected ? "—"
    : workState.phase === "idle" ? "neu"
    : workState.phase === "scanning" ? "liest…"
    : workState.phase === "not-coop" ? "ignoriert"
    : workState.phase === "extracted" ? "Entwurf"
    : "Vorgang";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300",
        open ? "w-80" : "w-10",
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
          {selected && workState.phase === "idle" && (
            <IdlePanel
              onAnalyse={() => onSetWorkState({ phase: "scanning" })}
              onNotCoop={() => onSetWorkState({ phase: "not-coop" })}
              onManualCreate={() =>
                onSetWorkState({
                  phase: "extracted",
                  data: {
                    brand: "",
                    contact: "",
                    creatorId: null,
                    creatorConfidence: 0,
                    format: "",
                    product: "",
                    budget: null,
                    period: "",
                    uncertainFields: [],
                  },
                })
              }
            />
          )}
          {selected && workState.phase === "scanning" && <ScanningPanel />}
          {selected && workState.phase === "not-coop" && <NotCoopPanel />}
          {selected && workState.phase === "extracted" && (
            <ExtractedPanel
              data={workState.data}
              creators={creators}
              onSetWorkState={onSetWorkState}
            />
          )}
          {selected && workState.phase === "vorgang" && (
            <VorgangPanel
              vorgang={workState.vorgang}
              creators={creators}
              onSetWorkState={onSetWorkState}
            />
          )}
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
