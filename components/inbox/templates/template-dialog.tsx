"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QueryKeys } from "@/lib/query-keys";
import type { Template } from "@/domains/templates";
import { TemplateForm, templateToFormValue } from "./template-form";

export function TemplateDialog({
  template,
  onClose,
}: {
  template: Template | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(() => templateToFormValue(template));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!template || !value.name.trim() || !value.body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value.name.trim(),
          channel: value.channel,
          subject: value.subject.trim() || null,
          body: value.body,
        }),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen");
      queryClient.invalidateQueries({ queryKey: QueryKeys.templates.list() });
      onClose();
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vorlage bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TemplateForm
            value={value}
            onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
            showSubject={value.channel === "email"}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button type="submit" disabled={saving || !value.name.trim() || !value.body.trim()}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
