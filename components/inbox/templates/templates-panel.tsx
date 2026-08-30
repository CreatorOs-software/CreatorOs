"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Auflister } from "@/components/ui/auflister";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { QueryKeys } from "@/lib/query-keys";
import type { Template } from "@/domains/templates";
import { templatesColumns } from "./templates-columns";
import { TemplateDialog } from "./template-dialog";
import { NeueTemplateDialog } from "./neue-template-dialog";

export function TemplatesPanel() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery<{ templates: Template[] }>({
    queryKey: QueryKeys.templates.list(),
    queryFn: () => fetch("/api/templates").then((r) => r.json()),
    staleTime: 60_000,
  });

  const templates = data?.templates ?? [];

  const [neueOpen, setNeueOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen");
      queryClient.invalidateQueries({ queryKey: QueryKeys.templates.list() });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-0 overflow-hidden">
        {isPending ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Auflister
            data={templates}
            columns={templatesColumns}
            emptyText="Noch keine Vorlagen angelegt."
            onRowClick={(t) => setEditing(t)}
            onDelete={(t) => setDeleteTarget(t)}
            filterRight={
              <Button
                variant="default"
                className="gap-1.5 h-8 text-xs"
                onClick={() => setNeueOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Neue Vorlage
              </Button>
            }
          />
        )}
      </Card>

      <NeueTemplateDialog open={neueOpen} onClose={() => setNeueOpen(false)} />
      {editing && <TemplateDialog template={editing} onClose={() => setEditing(null)} />}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Vorlage löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die Vorlage{" "}
            <span className="font-medium text-foreground">{deleteTarget?.name}</span> wird
            unwiderruflich gelöscht.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={handleConfirmDelete}>
              {deleting ? "Löschen…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
