"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Anfrage } from "../types";
import { anfrageColumns, daysSince, isEndState } from "./anfragen-columns";
import { AnfrageDialog } from "./anfrage-dialog";
import { NeueAnfrageDialog } from "./neue-anfrage-dialog";

export function AnfragenPanel({
  initialAnfragen,
  creatorId,
}: {
  initialAnfragen: Anfrage[];
  creatorId: string;
}) {
  "use no memo";
  const router = useRouter();
  const [selected, setSelected] = useState<Anfrage | null>(null);
  const [neueOpen, setNeueOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [localUpdates, setLocalUpdates] = useState<Record<string, Anfrage>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [localCreated, setLocalCreated] = useState<Anfrage[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Anfrage | null>(null);
  const [formatFilter, setFormatFilter] = useState<Set<string>>(new Set());

  const allAnfragen: Anfrage[] = [
    ...localCreated.filter((a) => !initialAnfragen.some((b) => b.id === a.id)),
    ...initialAnfragen
      .filter((a) => !deletedIds.has(a.id))
      .map((a) => localUpdates[a.id] ?? a),
  ];

  const availableFormats = [
    ...new Set(allAnfragen.map((a) => a.format).filter(Boolean) as string[]),
  ].sort();

  const anfragen = allAnfragen.filter(
    (a) => formatFilter.size === 0 || formatFilter.has(a.format ?? ""),
  );

  const activeAnfragen = anfragen.filter((a) => !isEndState(a.status));
  const closedAnfragen = anfragen.filter((a) => isEndState(a.status));
  const lateCount = activeAnfragen.filter((a) => daysSince(a.created_at) >= 4).length;

  function handleUpdated(updated: Anfrage) {
    setLocalUpdates((prev) => ({ ...prev, [updated.id]: updated }));
    setSelected((prev) => (prev?.id === updated.id ? updated : prev));
  }

  function handleDeleted(id: string) {
    setDeletedIds((prev) => new Set([...prev, id]));
    setSelected(null);
  }

  function handleCreated(a: Anfrage) {
    setLocalCreated((prev) => [a, ...prev]);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    handleDeleted(targetId);
    try {
      await fetch(`/api/anfragen/${targetId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  }

  return (
    <>
      <Card className="p-5 gap-0 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold">Anfragen</h3>
          {!showClosed && activeAnfragen.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 text-[9px] font-medium">
              {activeAnfragen.length}
            </span>
          )}
          {!showClosed && lateCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/15 text-red-500 text-[9px] font-medium">
              {lateCount}
            </span>
          )}
        </div>

        <Auflister
          data={showClosed ? closedAnfragen : activeAnfragen}
          columns={anfrageColumns}
          emptyText="Noch keine Anfragen – klicke auf »+ Neue Anfrage«"
          onRowClick={setSelected}
          onEdit={setSelected}
          onDelete={setDeleteTarget}
          searchPlaceholder="Anfrage suchen…"
          filterContent={
            availableFormats.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                  Format
                </p>
                {availableFormats.map((fmt) => (
                  <label
                    key={fmt}
                    className="flex items-center gap-2 cursor-pointer rounded px-1 py-1 hover:bg-muted/50 text-xs"
                  >
                    <Checkbox
                      checked={formatFilter.has(fmt)}
                      onCheckedChange={(checked) =>
                        setFormatFilter((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(fmt);
                          else next.delete(fmt);
                          return next;
                        })
                      }
                    />
                    {fmt}
                  </label>
                ))}
                {formatFilter.size > 0 && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground mt-2 px-1 text-left"
                    onClick={() => setFormatFilter(new Set())}
                  >
                    Zurücksetzen
                  </button>
                )}
              </div>
            ) : undefined
          }
          activeFilterCount={formatFilter.size}
          filterLeft={
            <SegmentedControl
              value={showClosed ? "closed" : "open"}
              onChange={(v) => setShowClosed(v === "closed")}
              options={[
                { value: "open", label: "Offen" },
                {
                  value: "closed",
                  label:
                    closedAnfragen.length > 0 ? (
                      <>
                        {`Abgeschlossen`}
                        <span className="ml-1 opacity-60">({closedAnfragen.length})</span>
                      </>
                    ) : (
                      "Abgeschlossen"
                    ),
                },
              ]}
            />
          }
          filterRight={
            <Button
              variant="default"
              className="gap-1.5 h-7 text-xs"
              onClick={() => setNeueOpen(true)}
            >
              <Plus className="w-3 h-3" />
              Neue Anfrage
            </Button>
          }
        />
      </Card>

      <AnfrageDialog
        key={selected?.id ?? "none"}
        anfrage={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        creatorId={creatorId}
      />

      <NeueAnfrageDialog
        open={neueOpen}
        onClose={() => setNeueOpen(false)}
        onCreated={handleCreated}
        creatorId={creatorId}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Anfrage löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die Anfrage von{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.brands?.company_name ?? deleteTarget?.brand_name ?? "dieser Brand"}
            </span>{" "}
            wird unwiderruflich gelöscht.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
