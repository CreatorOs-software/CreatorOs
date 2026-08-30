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
import { TemplateForm, templateToFormValue, type TemplateFormValue } from "./template-form";

export function NeueTemplateDialog({
  open,
  onClose,
  initialValue,
}: {
  open: boolean;
  onClose: () => void;
  /** Prefill, e.g. when creating a template from the current reply draft. */
  initialValue?: Partial<TemplateFormValue>;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(() => templateToFormValue(null, initialValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed with the latest draft every time the dialog transitions to open
  // (render-time state adjustment, not an effect — see react.dev "Resetting
  // state when a prop changes").
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(templateToFormValue(null, initialValue));
      setError(null);
    }
  }

  function reset() {
    setValue(templateToFormValue());
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.name.trim() || !value.body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value.name.trim(),
          channel: value.channel,
          subject: value.subject.trim() || null,
          body: value.body,
        }),
      });
      if (!res.ok) throw new Error("Anlegen fehlgeschlagen");
      queryClient.invalidateQueries({ queryKey: QueryKeys.templates.list() });
      reset();
      onClose();
    } catch {
      setError("Anlegen fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Vorlage</DialogTitle>
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
              {saving ? "Anlegen…" : "Vorlage anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
