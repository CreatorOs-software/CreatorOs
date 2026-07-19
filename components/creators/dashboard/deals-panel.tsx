"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Auflister } from "@/components/ui/auflister";
import type { Creator } from "@/domains/creators/types";
import type { DealFull } from "./types";
import { ALT, LAUFEND } from "./constants";
import { laufendColumns } from "./deals-columns";
import { DealDialog } from "./deal-dialog";

interface DealsPanelProps {
  deals: DealFull[];
  creator: Creator | null;
}

export function DealsPanel({ deals, creator }: DealsPanelProps) {
  const router = useRouter();
  const [selectedDeal, setSelectedDeal] = useState<DealFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DealFull | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [showAlt, setShowAlt] = useState(false);

  const visibleDeals = deals.filter((d) => !deletedIds.has(d.id));
  const laufend = visibleDeals.filter((d) => LAUFEND.has(d.status));
  const alt = visibleDeals.filter((d) => ALT.has(d.status));

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

  return (
    <>
      <Card className="p-5 gap-0 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Deals</h3>
          <div className="flex items-center gap-2">
            <SegmentedControl
              value={showAlt ? "abgeschlossen" : "laufend"}
              onChange={(v) => setShowAlt(v === "abgeschlossen")}
              options={[
                { value: "laufend", label: "Laufend" },
                {
                  value: "abgeschlossen",
                  label:
                    alt.length > 0
                      ? `Abgeschlossen (${alt.length})`
                      : "Abgeschlossen",
                },
              ]}
            />
            <Button variant="default" className="gap-1.5 h-7 text-xs">
              <Plus className="w-3 h-3" />
              Neuer Deal
            </Button>
          </div>
        </div>

        <Auflister
          data={showAlt ? alt : laufend}
          columns={laufendColumns}
          emptyText={
            showAlt ? "Keine abgeschlossenen Deals" : "Keine laufenden Deals"
          }
          onRowClick={setSelectedDeal}
          onEdit={(d) => router.push(`/creators/deals/edit/${d.id}`)}
          onDelete={setDeleteTarget}
        />
      </Card>

      <DealDialog
        deal={selectedDeal}
        creatorName={creator?.full_name}
        open={selectedDeal !== null}
        onClose={() => setSelectedDeal(null)}
      />

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
    </>
  );
}
