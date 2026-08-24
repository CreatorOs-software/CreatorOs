"use client";

import { Sparkles, Plus, Trash2, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { AccordionContent } from "@/components/ui/accordion";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Creator } from "../../types";
import type {
  WorkPanelState,
  ExtractedEmailData,
  ExtractedDeliverable,
  LocalVorgang,
} from "../types";
import { SectionLabel, FormField } from "./shared";

const TODAY = new Date().toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

const CONTENT_TYPES = [
  "Video",
  "Reel",
  "Story",
  "Post",
  "Shorts",
  "Podcast",
  "Blog",
  "Newsletter",
];
const PLATFORMS = [
  "Instagram",
  "YouTube",
  "TikTok",
  "X / Twitter",
  "LinkedIn",
  "Podcast",
  "Blog",
];

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
      return res.json() as Promise<{
        brands: { id: string; company_name: string }[];
      }>;
    },
  });
  const brands = brandsData?.brands ?? [];

  const uncertain = (f: string) =>
    data.uncertainFields.includes(f) && !(data as Record<string, unknown>)[f];

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

  function addDeliverable() {
    patch({
      deliverables: [
        ...data.deliverables,
        {
          count: 1,
          content_type: "",
          platform: "",
          draft_deadline: "",
          freigabe_deadline: "",
          live_date: "",
        },
      ],
    });
  }

  function updateDeliverable(
    index: number,
    update: Partial<ExtractedDeliverable>,
  ) {
    const next = data.deliverables.map((d, i) =>
      i === index ? { ...d, ...update } : d,
    );
    patch({ deliverables: next });
  }

  function removeDeliverable(index: number) {
    patch({ deliverables: data.deliverables.filter((_, i) => i !== index) });
  }

  function handleCreate() {
    const vorgang: LocalVorgang = {
      brand: data.brand || "Unbekannte Brand",
      creatorId: data.creatorId,
      title:
        data.deliverables.length > 0
          ? data.deliverables
              .map((d) => `${d.count}x ${d.content_type}`)
              .join(" + ")
          : "Kooperation",
      status: "anfrage",
      amZug: "wir",
      honorar: null,
      stand: "Anfrage aus E-Mail übernommen. Noch nicht beantwortet.",
      history: data.budget
        ? [
            {
              who: "brand",
              amount: data.budget,
              note: "aus der Anfrage",
              date: TODAY,
            },
          ]
        : [],
    };
    onSetWorkState({ phase: "vorgang", vorgang });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-violet-600" />
        <SectionLabel>Aus der Mail gelesen</SectionLabel>
        <span className="ml-auto text-[10px] text-muted-foreground">
          1 Analyse
        </span>
      </div>

      <Tabs defaultValue="uebersicht" className="mb-4 flex flex-col">
        <TabsList variant="underline" className="w-full">
          <TabsTrigger value="uebersicht" className="flex-1">
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="flex-1">
            Deliverables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht" className="mt-3 space-y-0">
          <FormField label="Brand" uncertain={uncertain("brand")}>
            <Select
              value={data.brand || undefined}
              onValueChange={(v) => {
                if (v !== null) patch({ brand: v });
              }}
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  uncertain("brand") &&
                    "border-dashed border-amber-300 bg-amber-50",
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
              className={cn(
                uncertain("contact") &&
                  "border-dashed border-amber-300 bg-amber-50",
              )}
              onChange={(e) => patch({ contact: e.target.value })}
            />
          </FormField>

          <FormField
            label={
              data.creatorConfidence > 0
                ? `Creator · ${data.creatorConfidence}% sicher`
                : "Creator"
            }
            uncertain={uncertain("creatorId")}
          >
            <Select
              value={data.creatorId ?? ""}
              onValueChange={(v) =>
                patch({ creatorId: v || null, creatorConfidence: v ? 100 : 0 })
              }
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  uncertain("creatorId") &&
                    "border-dashed border-amber-300 bg-amber-50",
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

          <FormField label="Produkt" uncertain={uncertain("product")}>
            <Input
              value={data.product}
              placeholder="z. B. Daily Greens"
              className={cn(
                uncertain("product") &&
                  "border-dashed border-amber-300 bg-amber-50",
              )}
              onChange={(e) => patch({ product: e.target.value })}
            />
          </FormField>

          <FormField label="Budget (Brand)" uncertain={uncertain("budget")}>
            <Input
              value={data.budget?.toString() ?? ""}
              placeholder="z. B. 5500"
              className={cn(
                uncertain("budget") &&
                  "border-dashed border-amber-300 bg-amber-50",
              )}
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
              className={cn(
                uncertain("period") &&
                  "border-dashed border-amber-300 bg-amber-50",
              )}
              onChange={(e) => patch({ period: e.target.value })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Kampagnenstart">
              <Input
                type="date"
                value={data.campaign_start}
                onChange={(e) => patch({ campaign_start: e.target.value })}
              />
            </FormField>
            <FormField label="Kampagnenende">
              <Input
                type="date"
                value={data.campaign_end}
                onChange={(e) => patch({ campaign_end: e.target.value })}
              />
            </FormField>
          </div>
        </TabsContent>

        <TabsContent value="deliverables" className="mt-3">
          <div className="flex flex-col gap-2">
            {data.deliverables.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Noch keine Deliverables. Füge das erste hinzu.
              </p>
            )}

            <AccordionPrimitive.Root multiple className="flex flex-col gap-2">
              {data.deliverables.map((d, i) => {
                const summary = d.content_type
                  ? `${d.count}x ${d.content_type}${d.platform ? ` · ${d.platform}` : ""}`
                  : `Deliverable ${i + 1}`;
                return (
                  <AccordionPrimitive.Item
                    key={i}
                    value={String(i)}
                    className="rounded-xl border border-border bg-muted/40"
                  >
                    <AccordionPrimitive.Header className="flex items-center">
                      <AccordionPrimitive.Trigger className="group flex flex-1 cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left text-xs font-medium outline-none">
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
                        <span className="flex-1 truncate">{summary}</span>
                      </AccordionPrimitive.Trigger>
                      <button
                        type="button"
                        onClick={() => removeDeliverable(i)}
                        className="px-3 py-2.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </AccordionPrimitive.Header>

                    <AccordionContent className="px-3">
                      <div className="grid grid-cols-5 gap-1.5 pb-1">
                        <div className="col-span-1">
                          <p className="mb-1 text-[10px] text-muted-foreground">
                            Anz.
                          </p>
                          <Input
                            type="number"
                            min={1}
                            value={d.count}
                            className="h-7 px-2 text-xs"
                            onChange={(e) =>
                              updateDeliverable(i, {
                                count: Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="col-span-4">
                          <p className="mb-1 text-[10px] text-muted-foreground">
                            Content-Typ
                          </p>
                          <Select
                            value={d.content_type || undefined}
                            onValueChange={(v) => {
                              if (v !== null)
                                updateDeliverable(i, { content_type: v });
                            }}
                          >
                            <SelectTrigger className="h-7 w-full text-xs">
                              <SelectValue placeholder="Typ wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTENT_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="pb-1">
                        <p className="mb-1 text-[10px] text-muted-foreground">
                          Plattform
                        </p>
                        <Select
                          value={d.platform || undefined}
                          onValueChange={(v) => {
                            if (v !== null)
                              updateDeliverable(i, { platform: v });
                          }}
                        >
                          <SelectTrigger className="h-7 w-full text-xs">
                            <SelectValue placeholder="Plattform wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLATFORMS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pb-1">
                        <div>
                          <p className="mb-1 text-[10px] text-muted-foreground">
                            Draft-Deadline
                          </p>
                          <Input
                            type="date"
                            value={d.draft_deadline}
                            className="h-7 px-2 text-xs"
                            onChange={(e) =>
                              updateDeliverable(i, {
                                draft_deadline: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] text-muted-foreground">
                            Live-Datum
                          </p>
                          <Input
                            type="date"
                            value={d.live_date}
                            className="h-7 px-2 text-xs"
                            onChange={(e) =>
                              updateDeliverable(i, {
                                live_date: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionPrimitive.Item>
                );
              })}
            </AccordionPrimitive.Root>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={addDeliverable}
            >
              <Plus className="h-3 w-3" />
              Deliverable hinzufügen
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-2 flex flex-col gap-2">
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
