"use client";

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel, FormField } from "./shared";
import type { WorkPanelState, NewBrandData } from "../types";

function generateShortCode(name: string): string {
  return name
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 4)
    .padEnd(1, "X");
}

const DEFAULT_COLOR = "#6366F1";

type Props = {
  newBrand: NewBrandData;
  onSetWorkState: (s: WorkPanelState) => void;
};

export function NewBrandPanel({ newBrand, onSetWorkState }: Props) {
  const [companyName, setCompanyName] = useState(newBrand.brand_name);
  const [industry, setIndustry] = useState(newBrand.industry ?? "");
  const [shortCode, setShortCode] = useState(generateShortCode(newBrand.brand_name));
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!companyName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          short_code: shortCode.trim().toUpperCase() || "XX",
          color,
          industry: industry.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Fehler beim Erstellen");
      }
      // Brand created → proceed to extracted form
      onSetWorkState({
        phase: "extracted",
        data: { ...newBrand.extractedData, brand: companyName.trim() },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        <Building2 className="h-3 w-3 text-amber-600" />
        <SectionLabel>Neue Brand erkannt</SectionLabel>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Diese Brand ist noch nicht in TalentOS. Angaben vorausgefüllt aus der Mail — bitte prüfen und speichern.
      </p>

      <FormField label="Firmenname">
        <Input
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            setShortCode(generateShortCode(e.target.value));
          }}
          placeholder="z. B. Nike GmbH"
        />
      </FormField>

      <FormField label="Branche">
        <Input
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="z. B. Sport & Fitness"
        />
      </FormField>

      <FormField label="Kürzel (max. 4 Zeichen)">
        <Input
          value={shortCode}
          maxLength={4}
          onChange={(e) => setShortCode(e.target.value.toUpperCase())}
          placeholder="NIK"
          className="uppercase"
        />
      </FormField>

      <FormField label="Farbe">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
          <span className="text-xs text-muted-foreground">{color}</span>
        </div>
      </FormField>

      {error && (
        <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <Button className="w-full" onClick={handleCreate} disabled={!companyName.trim() || saving}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {saving ? "Wird erstellt…" : "Brand erstellen"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            onSetWorkState({
              phase: "extracted",
              data: { ...newBrand.extractedData, brand: companyName.trim() },
            })
          }
        >
          Überspringen
        </Button>
      </div>
    </div>
  );
}
