"use client";

import { useEffect, useState } from "react";
import { Dice5 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@talentos/ui";
import type { AvatarConfig } from "@/lib/avatar";
import { AvatarDisplay, makeAvatarConfig } from "./avatar-display";

type Option = { value: string; label: string };
const OPTIONS: Array<{ key: keyof AvatarConfig; label: string; values: Option[] }> = [
  { key: "sex", label: "Stil", values: [{ value: "woman", label: "Feminin" }, { value: "man", label: "Maskulin" }] },
  { key: "hairStyle", label: "Frisur", values: [{ value: "normal", label: "Normal" }, { value: "thick", label: "Voluminös" }, { value: "mohawk", label: "Irokesenschnitt" }, { value: "womanLong", label: "Lang" }, { value: "womanShort", label: "Kurz" }] },
  { key: "hatStyle", label: "Kopfbedeckung", values: [{ value: "none", label: "Keine" }, { value: "beanie", label: "Beanie" }, { value: "turban", label: "Turban" }] },
  { key: "eyeStyle", label: "Augen", values: [{ value: "circle", label: "Rund" }, { value: "oval", label: "Oval" }, { value: "smile", label: "Lächelnd" }] },
  { key: "glassesStyle", label: "Brille", values: [{ value: "none", label: "Keine" }, { value: "round", label: "Rund" }, { value: "square", label: "Eckig" }] },
  { key: "noseStyle", label: "Nase", values: [{ value: "short", label: "Kurz" }, { value: "long", label: "Lang" }, { value: "round", label: "Rund" }] },
  { key: "mouthStyle", label: "Mund", values: [{ value: "laugh", label: "Lachend" }, { value: "smile", label: "Lächelnd" }, { value: "peace", label: "Entspannt" }] },
  { key: "shirtStyle", label: "Oberteil", values: [{ value: "hoody", label: "Hoodie" }, { value: "short", label: "T-Shirt" }, { value: "polo", label: "Polo" }] },
];
const COLORS: Array<{ key: keyof AvatarConfig; label: string }> = [
  { key: "faceColor", label: "Haut" }, { key: "hairColor", label: "Haare" },
  { key: "hatColor", label: "Kopfbedeckung" }, { key: "shirtColor", label: "Oberteil" },
  { key: "bgColor", label: "Hintergrund" },
];

interface AvatarEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value?: AvatarConfig | null;
  seed: string;
  name?: string | null;
  onSave: (config: AvatarConfig) => void;
}

export function AvatarEditorDialog({ open, onOpenChange, value, seed, name, onSave }: AvatarEditorDialogProps) {
  const [draft, setDraft] = useState<AvatarConfig>(() => value ?? makeAvatarConfig(seed));

  useEffect(() => {
    // The dialog draft intentionally resets whenever a new editing session opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(value ?? makeAvatarConfig(seed));
  }, [open, seed, value]);

  function randomize() {
    setDraft(makeAvatarConfig(`${seed}-${crypto.randomUUID()}`));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Avatar erstellen</DialogTitle>
          <DialogDescription>Gestalte einen individuellen Avatar. Änderungen werden erst beim Übernehmen gespeichert.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-2 md:grid-cols-[180px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-muted/40 p-5">
            <AvatarDisplay config={draft} seed={seed} name={name} className="size-32" />
            <Button type="button" variant="outline" size="sm" onClick={randomize}>
              <Dice5 className="size-4" /> Zufällig
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {OPTIONS.map(({ key, label, values }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Select value={String(draft[key])} onValueChange={(next) => setDraft((current) => ({ ...current, [key]: next }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{values.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            {COLORS.map(({ key, label }) => (
              <label key={key} className="space-y-1.5">
                <span className="block text-sm font-medium">{label}</span>
                <span className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2">
                  <input type="color" value={String(draft[key])} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} className="size-6 cursor-pointer border-0 bg-transparent p-0" />
                  <span className="text-xs text-muted-foreground uppercase">{String(draft[key])}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button type="button" onClick={() => { onSave(draft); onOpenChange(false); }}>Avatar übernehmen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
