"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Auflister } from "@/components/ui/auflister";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { Creator } from "@/domains/creators/types";
import type { DealFull, Anfrage } from "./types";
import { ALT, daysUntil, fmtMoney } from "./constants";
import { DealDialog } from "./deal-dialog";
import { AnfragenPanel } from "./anfragen-panel";
import { laufendColumns } from "./deals-columns";

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysSinceIso(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

function sinceLabel(deals: DealFull[]): string | null {
  const timestamps = deals
    .filter((d) => ALT.has(d.status))
    .map((d) => new Date(d.created_at).getTime())
    .sort((a, b) => a - b);
  if (!timestamps.length) return null;
  return new Date(timestamps[0]).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: string | null;
}) {
  return (
    <Card className="rounded-2xl p-5 gap-0">
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-3 gap-0">
        <CardTitle className="text-sm font-semibold text-foreground">
          {label}
        </CardTitle>
        <Button variant="outline" size="icon-sm">
          <ArrowUpRight />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function DealsTab({
  deals,
  anfragen,
  creator,
  creatorId,
}: {
  deals: DealFull[];
  anfragen: Anfrage[];
  creator: Creator | null;
  creatorId: string;
}) {
  const router = useRouter();
  const [selectedDeal, setSelectedDeal] = useState<DealFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DealFull | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [showAlt, setShowAlt] = useState(false);
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<Set<string>>(new Set());

  const visibleDeals = deals.filter((d) => !deletedIds.has(d.id));

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/deals/${deleteTarget.id}`, { method: "DELETE" });
      setDeletedIds((prev) => new Set([...prev, deleteTarget.id]));
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  const availableCampaignTypes = [
    ...new Set(deals.map((d) => d.campaign_type).filter(Boolean) as string[]),
  ].sort();

  const baseDeals = visibleDeals.filter(
    (d) =>
      campaignTypeFilter.size === 0 || campaignTypeFilter.has(d.campaign_type ?? ""),
  );

  const laufend = baseDeals.filter((d) => !ALT.has(d.status));
  const alt = baseDeals.filter((d) => ALT.has(d.status));
  const activeAnfragen = anfragen.filter(
    (a) => a.status !== "gewonnen" && a.status !== "abgelehnt",
  );

  const activeBudget = laufend.reduce((s, d) => s + Number(d.budget), 0);
  const since = sinceLabel(visibleDeals);

  type Alert = { label: string; detail: string };
  const alerts: Alert[] = [
    ...laufend
      .filter((d) => d.deadline && daysUntil(d.deadline) <= 3)
      .map((d) => {
        const days = daysUntil(d.deadline!);
        const detail =
          days < 0
            ? `Deadline überschritten (${Math.abs(days)}T)`
            : days === 0
              ? "Deadline heute"
              : `Deadline in ${days} Tag${days === 1 ? "" : "en"}`;
        return { label: d.brands?.company_name ?? d.title, detail };
      }),
    ...anfragen
      .filter((a) => {
        const isEnd = a.status === "gewonnen" || a.status === "abgelehnt";
        const days = daysSinceIso(a.created_at);
        return !isEnd && days > 3;
      })
      .map((a) => {
        const days = daysSinceIso(a.created_at);
        return {
          label: a.brands?.company_name ?? a.brand_name ?? "Unbekannte Brand",
          detail: `Anfrage seit ${days} Tagen offen`,
        };
      }),
  ];

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* Urgent alerts banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl bg-red-500/8 border border-red-200/60 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-semibold">Handlungsbedarf</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[11px] bg-red-500/10 text-red-700 rounded-lg px-2.5 py-1"
              >
                <span className="font-medium">{a.label}</span>
                <span className="opacity-70">·</span>
                <span>{a.detail}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Laufende Deals"
          value={laufend.length}
          sub={`${fmtMoney(activeBudget)} Volumen`}
        />
        <StatCard
          label="Offene Anfragen"
          value={activeAnfragen.length}
          sub={
            activeAnfragen.length > 0
              ? `${anfragen.filter((a) => a.status === "verhandlung").length} in Verhandlung`
              : "Keine offenen Anfragen"
          }
        />
        <StatCard
          label="Abgeschlossene Kooperationen"
          value={alt.length}
          sub={since ? `seit ${since}` : null}
        />
      </div>

      {/* Laufende Deals */}
      <Card className="p-5 gap-0 rounded-2xl">
        <h3 className="text-sm font-semibold mb-3">Deals</h3>
        <Auflister
          data={showAlt ? alt : laufend}
          columns={laufendColumns}
          emptyText={showAlt ? "Keine abgeschlossenen Deals" : "Keine laufenden Deals"}
          onRowClick={setSelectedDeal}
          onEdit={(d) => router.push(`/creators/deals/edit/${d.id}`)}
          onDelete={setDeleteTarget}
          searchPlaceholder="Deal suchen…"
          filterContent={
            availableCampaignTypes.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                  Format
                </p>
                {availableCampaignTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer rounded px-1 py-1 hover:bg-muted/50 text-xs"
                  >
                    <Checkbox
                      checked={campaignTypeFilter.has(type)}
                      onCheckedChange={(checked) =>
                        setCampaignTypeFilter((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(type);
                          else next.delete(type);
                          return next;
                        })
                      }
                    />
                    {type}
                  </label>
                ))}
                {campaignTypeFilter.size > 0 && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground mt-2 px-1 text-left"
                    onClick={() => setCampaignTypeFilter(new Set())}
                  >
                    Zurücksetzen
                  </button>
                )}
              </div>
            ) : undefined
          }
          activeFilterCount={campaignTypeFilter.size}
          filterLeft={
            <SegmentedControl
              value={showAlt ? "abgeschlossen" : "laufend"}
              onChange={(v) => setShowAlt(v === "abgeschlossen")}
              options={[
                { value: "laufend", label: "Laufend" },
                { value: "abgeschlossen", label: alt.length > 0 ? `Abgeschlossen (${alt.length})` : "Abgeschlossen" },
              ]}
            />
          }
          filterRight={
            <Button variant="default" className="gap-1.5 h-7 text-xs">
              <Plus className="w-3 h-3" />
              Neuer Deal
            </Button>
          }
        />
      </Card>

      {/* Anfragen (incoming deal inquiries) */}
      <AnfragenPanel initialAnfragen={anfragen} creatorId={creatorId} />

      {/* Deal detail dialog */}
      <DealDialog
        deal={selectedDeal}
        creatorName={creator?.full_name}
        open={selectedDeal !== null}
        onClose={() => setSelectedDeal(null)}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deal löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.title}
            </span>{" "}
            wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig
            gemacht werden.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
            >
              {deleteLoading ? "Löschen…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
