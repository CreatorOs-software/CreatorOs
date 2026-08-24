"use client";

import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Creator } from "../../types";
import type { WorkPanelState, LocalVorgang } from "../types";
import { SectionLabel } from "./shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EUR = (n: number | null) =>
  n != null ? n.toLocaleString("de-DE") + " €" : "—";

const STATUS_LABEL: Record<LocalVorgang["status"], string> = {
  anfrage: "Anfrage",
  verh: "In Verhandlung",
  aktiv: "Aktiv",
  fertig: "Abgeschlossen",
};

const ZUG_OPTIONS: Array<{ label: string; value: LocalVorgang["amZug"] }> = [
  { label: "Wir", value: "wir" },
  { label: "Brand", value: "brand" },
  { label: "Creator", value: "creator" },
];

// ─── Nudge ────────────────────────────────────────────────────────────────────

type NudgeKind = "warning" | "info" | "success";

function Nudge({ kind, title, body }: { kind: NudgeKind; title: string; body: string }) {
  const styles: Record<NudgeKind, string> = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-violet-50 border-violet-200 text-violet-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };
  const Icon =
    kind === "warning" ? TriangleAlert : kind === "success" ? CheckCircle2 : Info;

  return (
    <div className={cn("mb-2 flex gap-2.5 rounded-xl border px-3 py-2.5 text-xs", styles[kind])}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 opacity-80">{body}</p>
      </div>
    </div>
  );
}

// ─── VorgangPanel ─────────────────────────────────────────────────────────────

type Props = {
  vorgang: LocalVorgang;
  creators: Creator[];
  onSetWorkState: (s: WorkPanelState) => void;
};

export function VorgangPanel({ vorgang, creators, onSetWorkState }: Props) {
  const creator = creators.find((c) => c.id === vorgang.creatorId);

  function update(patch: Partial<LocalVorgang>) {
    onSetWorkState({ phase: "vorgang", vorgang: { ...vorgang, ...patch } });
  }

  const brandInitials = vorgang.brand
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Vorgang</SectionLabel>
          <Badge variant="secondary">{STATUS_LABEL[vorgang.status]}</Badge>
        </div>
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-[11px] font-bold text-background">
            {brandInitials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{vorgang.brand}</p>
            <p className="text-xs text-muted-foreground">
              {vorgang.title}
              {creator ? ` · ${creator.full_name}` : ""}
            </p>
          </div>
        </div>
        <p className="rounded-xl bg-muted px-3 py-2.5 text-xs leading-relaxed">
          {vorgang.stand}
        </p>
      </section>

      <section>
        <SectionLabel>Am Zug</SectionLabel>
        <SegmentedControl
          options={ZUG_OPTIONS}
          value={vorgang.amZug}
          onChange={(v) => update({ amZug: v })}
          className="w-full"
        />
      </section>

      {vorgang.history.length > 0 && (
        <section>
          <SectionLabel>Angebotshistorie</SectionLabel>
          <div className="divide-y divide-border">
            {[...vorgang.history].reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-2 py-2 text-xs">
                <Badge variant={h.who === "wir" ? "default" : "secondary"}>
                  {h.who === "wir" ? "Wir" : "Brand"}
                </Badge>
                <span className="font-semibold">{EUR(h.amount)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{h.note}</span>
                <span className="shrink-0 text-muted-foreground">{h.date}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        {vorgang.amZug === "wir" && (
          <Nudge kind="warning" title="Du bist am Zug" body="Brand wartet auf deine Antwort." />
        )}
        {vorgang.status === "anfrage" && !vorgang.creatorId && (
          <Nudge kind="info" title="Creator noch nicht gefragt" body="Hat der Creator überhaupt Interesse?" />
        )}
        {vorgang.amZug === "brand" && (
          <Nudge kind="success" title="Brand ist am Zug" body="Warte auf Rückmeldung." />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Button className="w-full">Brand antworten</Button>
        {creator && (
          <Button variant="secondary" className="w-full">
            {creator.full_name.split(" ")[0]} fragen
          </Button>
        )}
        <Button variant="outline" className="w-full">
          Deal-Akte öffnen
        </Button>
      </section>
    </div>
  );
}
