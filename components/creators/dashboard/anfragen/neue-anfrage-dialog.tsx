"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Anfrage } from "../types";

const FORMAT_OPTIONS = [
  "YouTube Video",
  "YouTube Short",
  "Instagram Reel",
  "Instagram Post",
  "Instagram Story",
  "TikTok Video",
  "Podcast Mention",
  "Sonstiges",
];

export function NeueAnfrageDialog({
  open,
  onClose,
  onCreated,
  creatorId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (a: Anfrage) => void;
  creatorId: string;
}) {
  const [brandName, setBrandName] = useState("");
  const [format, setFormat] = useState("");
  const [budgetRaw, setBudgetRaw] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brandName.trim()) return;
    setLoading(true);
    try {
      const budget = budgetRaw ? parseFloat(budgetRaw.replace(",", ".")) : null;
      const res = await fetch(`/api/creators/${creatorId}/anfragen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName.trim(),
          format: format.trim() || null,
          budget_requested: budget && !isNaN(budget) ? budget : null,
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      const { anfrage } = await res.json();
      onCreated({ ...anfrage, brands: null });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Neue Anfrage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Brand *
            </label>
            <Input
              autoFocus
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Nike, L'Oréal, …"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Format
            </label>
            <Select value={format} onValueChange={(v) => setFormat(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="— optional —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— optional —</SelectItem>
                {FORMAT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Budget angefragt (€)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={budgetRaw}
              onChange={(e) => setBudgetRaw(e.target.value)}
              placeholder="5000"
            />
          </div>
          <DialogFooter className="mt-1">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button type="submit" disabled={loading || !brandName.trim()}>
              {loading ? "Speichern…" : "Anfrage anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
