"use client";

import { useState } from "react";
import { Sparkles, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
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
import type { WorkPanelState, ExtractedEmailData, LocalVorgang } from "../types";
import { SectionLabel, FormField } from "./shared";
import {
  collectErrors,
  type ExtractedErrors,
  type ExtractedField,
  type ExtractedFormValues,
} from "./extracted-form.schema";

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

// Always visible (required for submit).
const ALWAYS_SHOWN = ["brand", "creatorId"];
// Optional "Übersicht" fields, hidden until detected or revealed. "campaign"
// stands for the combined Kampagnenstart/-ende grid.
const OPTIONAL_OVERVIEW = ["contact", "product", "budget", "period", "campaign"];

type Props = {
  data: ExtractedEmailData;
  creators: Creator[];
  threadId: string;
  onSetWorkState: (s: WorkPanelState) => void;
};

function buildVorgang(v: ExtractedFormValues): LocalVorgang {
  return {
    brand: v.brand || "Unbekannte Brand",
    creatorId: v.creatorId || null,
    title:
      v.deliverables.length > 0
        ? v.deliverables.map((d) => `${d.count}x ${d.content_type}`).join(" + ")
        : "Kooperation",
    status: "anfrage",
    amZug: "wir",
    honorar: null,
    stand: "Anfrage aus E-Mail übernommen. Noch nicht beantwortet.",
    history: v.budget
      ? [{ who: "brand", amount: v.budget, note: "aus der Anfrage", date: TODAY }]
      : [],
  };
}

export function ExtractedPanel({ data, creators, threadId, onSetWorkState }: Props) {
  const queryClient = useQueryClient();
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

  const [errors, setErrors] = useState<ExtractedErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const form = useForm({
    defaultValues: {
      creatorId: data.creatorId ?? "",
      brand: data.brand ?? "",
      contact: data.contact ?? "",
      product: data.product ?? "",
      budget: data.budget,
      period: data.period ?? "",
      campaign_start: data.campaign_start ?? "",
      campaign_end: data.campaign_end ?? "",
      deliverables: data.deliverables.map((d) => ({
        count: d.count,
        content_type: d.content_type,
        platform: d.platform,
        draft_deadline: d.draft_deadline ?? "",
        freigabe_deadline: d.freigabe_deadline ?? "",
        live_date: d.live_date ?? "",
      })),
    } as ExtractedFormValues,
    onSubmit: async ({ value }) => {
      const errs = collectErrors(value);
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;

      setSaving(true);
      setSubmitError(null);
      try {
        const brandMatch = brands.find((b) => b.company_name === value.brand);
        const res = await fetch(`/api/creators/${value.creatorId}/anfragen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "email",
            brand_id: brandMatch?.id ?? null,
            brand_name: value.brand || null,
            contact_person: value.contact || null,
            product: value.product || null,
            budget_requested: value.budget ?? null,
            campaign_start: value.campaign_start || null,
            campaign_end: value.campaign_end || null,
            deliverables: value.deliverables.map((d) => ({
              count: d.count,
              content_type: d.content_type,
              platform: d.platform,
              draft_deadline: d.draft_deadline || null,
              freigabe_deadline: d.freigabe_deadline || null,
              live_date: d.live_date || null,
            })),
          }),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(b.error ?? "Anfrage konnte nicht angelegt werden");
        }

        // Anfrage exists — link the mail thread / conversation best-effort so a
        // failure here can't trigger a retry that creates a second Anfrage.
        const { anfrage } = (await res.json()) as { anfrage: { id: string } };
        try {
          await fetch(`/api/inbox/${threadId}/anfrage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ anfrage_id: anfrage.id }),
          });
          void queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.all() });
        } catch {}

        onSetWorkState({ phase: "vorgang", vorgang: buildVorgang(value) });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        setSaving(false);
      }
    },
  });

  const uncertain = (f: string) => data.uncertainFields.includes(f);
  const errorList = Object.values(errors);

  const isShown = (f: string) =>
    showMore || ALWAYS_SHOWN.includes(f) || data.detectedFields.includes(f);
  const hiddenCount = OPTIONAL_OVERVIEW.filter(
    (f) => !ALWAYS_SHOWN.includes(f) && !data.detectedFields.includes(f),
  ).length;

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
          <form.Field name="brand">
            {(field: ExtractedField<"brand">) => (
              <FormField label="Brand" uncertain={uncertain("brand")}>
                <Select
                  value={field.state.value || undefined}
                  onValueChange={(v) => {
                    if (v !== null) field.handleChange(v);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      (uncertain("brand") || errors.brand) &&
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
                {errors.brand && (
                  <p data-field-error className="mt-1 text-xs text-destructive">
                    {errors.brand}
                  </p>
                )}
              </FormField>
            )}
          </form.Field>

          {isShown("contact") && (
            <form.Field name="contact">
              {(field: ExtractedField<"contact">) => (
                <FormField label="Ansprechpartner" uncertain={uncertain("contact")}>
                  <Input
                    value={field.state.value}
                    className={cn(
                      uncertain("contact") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          <form.Field name="creatorId">
            {(field: ExtractedField<"creatorId">) => (
              <FormField
                label={
                  data.creatorConfidence > 0
                    ? `Creator · ${data.creatorConfidence}% sicher`
                    : "Creator"
                }
                uncertain={uncertain("creatorId")}
              >
                <Select
                  value={field.state.value || ""}
                  onValueChange={(v) => field.handleChange(v || "")}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      (uncertain("creatorId") || errors.creatorId) &&
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
                {errors.creatorId ? (
                  <p data-field-error className="mt-1 text-xs text-destructive">
                    {errors.creatorId}
                  </p>
                ) : (
                  !field.state.value && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Kein Name in der Mail — bitte manuell zuordnen.
                    </p>
                  )
                )}
              </FormField>
            )}
          </form.Field>

          {isShown("product") && (
            <form.Field name="product">
              {(field: ExtractedField<"product">) => (
                <FormField label="Produkt" uncertain={uncertain("product")}>
                  <Input
                    value={field.state.value}
                    placeholder="z. B. Daily Greens"
                    className={cn(
                      uncertain("product") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("budget") && (
            <form.Field name="budget">
              {(field: ExtractedField<"budget">) => (
                <FormField label="Budget (Brand)" uncertain={uncertain("budget")}>
                  <Input
                    value={field.state.value?.toString() ?? ""}
                    placeholder="z. B. 5500"
                    className={cn(
                      uncertain("budget") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value
                          ? parseFloat(e.target.value.replace(/[^0-9.]/g, ""))
                          : null,
                      )
                    }
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("period") && (
            <form.Field name="period">
              {(field: ExtractedField<"period">) => (
                <FormField label="Zeitraum" uncertain={uncertain("period")}>
                  <Input
                    value={field.state.value}
                    placeholder="steht nicht in der Mail"
                    className={cn(
                      uncertain("period") &&
                        "border-dashed border-amber-300 bg-amber-50",
                    )}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </FormField>
              )}
            </form.Field>
          )}

          {isShown("campaign") && (
            <div className="grid grid-cols-2 gap-2">
              <form.Field name="campaign_start">
                {(field: ExtractedField<"campaign_start">) => (
                  <FormField label="Kampagnenstart">
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </FormField>
                )}
              </form.Field>
              <form.Field name="campaign_end">
                {(field: ExtractedField<"campaign_end">) => (
                  <FormField label="Kampagnenende">
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </FormField>
                )}
              </form.Field>
            </div>
          )}

          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={showMore}
              onClick={() => setShowMore((v) => !v)}
              className="mt-1 w-full text-xs text-muted-foreground"
            >
              {showMore ? "Weniger Felder" : `+ Weitere Felder (${hiddenCount})`}
              {showMore ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="deliverables" className="mt-3">
          <form.Field name="deliverables">
            {(field: ExtractedField<"deliverables">) => {
              const items = field.state.value ?? [];

              const update = (
                index: number,
                patch: Partial<ExtractedFormValues["deliverables"][number]>,
              ) =>
                field.handleChange(
                  items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
                );

              const addDeliverable = () =>
                field.handleChange([
                  ...items,
                  {
                    count: 1,
                    content_type: "",
                    platform: "",
                    draft_deadline: "",
                    freigabe_deadline: "",
                    live_date: "",
                  },
                ]);

              const removeDeliverable = (index: number) =>
                field.handleChange(items.filter((_, i) => i !== index));

              return (
                <div className="flex flex-col gap-2">
                  {errors.deliverables && (
                    <p data-field-error className="text-xs text-destructive">
                      {errors.deliverables}
                    </p>
                  )}

                  {items.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Noch keine Deliverables. Füge das erste hinzu.
                    </p>
                  )}

                  <AccordionPrimitive.Root multiple className="flex flex-col gap-2">
                    {items.map((d, i) => {
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
                                    update(i, {
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
                                      update(i, { content_type: v });
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
                                  if (v !== null) update(i, { platform: v });
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
                                    update(i, { draft_deadline: e.target.value })
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
                                    update(i, { live_date: e.target.value })
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
              );
            }}
          </form.Field>
        </TabsContent>
      </Tabs>

      {(errorList.length > 0 || submitError) && (
        <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {submitError ? (
            <p>{submitError}</p>
          ) : (
            <ul className="list-inside list-disc space-y-0.5">
              {errorList.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={saving}
          onClick={() => form.handleSubmit()}
        >
          {saving ? "Wird angelegt…" : "Anfrage erstellen"}
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
