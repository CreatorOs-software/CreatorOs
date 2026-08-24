"use client";

import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Creator } from "../../types";
import type { WorkPanelState, ExtractedEmailData, LocalVorgang } from "../types";
import { SectionLabel, FormField } from "./shared";

const TODAY = new Date().toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

type Props = {
  data: ExtractedEmailData;
  creators: Creator[];
  onSetWorkState: (s: WorkPanelState) => void;
};

export function ExtractedPanel({ data, creators, onSetWorkState }: Props) {
  const { data: brandsData } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await fetch("/api/brands");
      return res.json() as Promise<{ brands: { id: string; company_name: string }[] }>;
    },
  });
  const brands = brandsData?.brands ?? [];

  const uncertain = (f: string) =>
    data.uncertainFields.includes(f) &&
    !(data as Record<string, unknown>)[f];

  function patch(update: Partial<ExtractedEmailData>) {
    onSetWorkState({
      phase: "extracted",
      data: {
        ...data,
        ...update,
        uncertainFields: data.uncertainFields.filter(
          (f) => !Object.keys(update).includes(f),
        ),
      },
    });
  }

  function handleCreate() {
    const vorgang: LocalVorgang = {
      brand: data.brand || "Unbekannte Brand",
      creatorId: data.creatorId,
      title: data.format || "Kooperation",
      status: "anfrage",
      amZug: "wir",
      honorar: null,
      stand: "Anfrage aus E-Mail übernommen. Noch nicht beantwortet.",
      history: data.budget
        ? [{ who: "brand", amount: data.budget, note: "aus der Anfrage", date: TODAY }]
        : [],
    };
    onSetWorkState({ phase: "vorgang", vorgang });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-violet-600" />
        <SectionLabel>Aus der Mail gelesen</SectionLabel>
        <span className="ml-auto text-[10px] text-muted-foreground">1 Analyse</span>
      </div>

      <FormField label="Brand" uncertain={uncertain("brand")}>
        <Select
          value={data.brand || undefined}
          onValueChange={(v) => { if (v !== null) patch({ brand: v }); }}
        >
          <SelectTrigger
            className={cn(
              "w-full",
              uncertain("brand") && "border-dashed border-amber-300 bg-amber-50",
            )}
          >
            <SelectValue placeholder="— Brand auswählen —" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.company_name}>
                {b.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Ansprechpartner" uncertain={uncertain("contact")}>
        <Input
          value={data.contact}
          className={cn(uncertain("contact") && "border-dashed border-amber-300 bg-amber-50")}
          onChange={(e) => patch({ contact: e.target.value })}
        />
      </FormField>

      <FormField
        label={data.creatorConfidence > 0 ? `Creator · ${data.creatorConfidence}% sicher` : "Creator"}
        uncertain={uncertain("creatorId")}
      >
        <Select
          value={data.creatorId ?? ""}
          onValueChange={(v) => patch({ creatorId: v || null, creatorConfidence: v ? 100 : 0 })}
        >
          <SelectTrigger
            className={cn(
              "w-full",
              uncertain("creatorId") && "border-dashed border-amber-300 bg-amber-50",
            )}
          >
            <SelectValue placeholder="— Creator zuordnen —" />
          </SelectTrigger>
          <SelectContent>
            {creators.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!data.creatorId && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Kein Name in der Mail — bitte manuell zuordnen.
          </p>
        )}
      </FormField>

      <FormField label="Format / Leistung" uncertain={uncertain("format")}>
        <Input
          value={data.format}
          placeholder="z. B. 1x Reel + 3x Story"
          className={cn(uncertain("format") && "border-dashed border-amber-300 bg-amber-50")}
          onChange={(e) => patch({ format: e.target.value })}
        />
      </FormField>

      <FormField label="Produkt" uncertain={uncertain("product")}>
        <Input
          value={data.product}
          placeholder="z. B. Daily Greens"
          className={cn(uncertain("product") && "border-dashed border-amber-300 bg-amber-50")}
          onChange={(e) => patch({ product: e.target.value })}
        />
      </FormField>

      <FormField label="Budget (Brand)" uncertain={uncertain("budget")}>
        <Input
          value={data.budget?.toString() ?? ""}
          placeholder="z. B. 5500"
          className={cn(uncertain("budget") && "border-dashed border-amber-300 bg-amber-50")}
          onChange={(e) =>
            patch({
              budget: e.target.value
                ? parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
                : null,
            })
          }
        />
      </FormField>

      <FormField label="Zeitraum" uncertain={uncertain("period")}>
        <Input
          value={data.period}
          placeholder="steht nicht in der Mail"
          className={cn(uncertain("period") && "border-dashed border-amber-300 bg-amber-50")}
          onChange={(e) => patch({ period: e.target.value })}
        />
      </FormField>

      <div className="mt-5 flex flex-col gap-2">
        <Button className="w-full" onClick={handleCreate}>
          Anfrage erstellen
        </Button>
        <Button variant="outline" className="w-full">
          Erst antworten, ohne anzulegen
        </Button>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => onSetWorkState({ phase: "not-coop" })}
        >
          Verwerfen
        </Button>
      </div>

      <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        Beim Anlegen wird der Mail-Thread mit dem Vorgang verknüpft.{" "}
        <span className="font-medium text-foreground">
          Ab dann liest die KI nur noch diesen Thread mit.
        </span>
      </p>
    </div>
  );
}
