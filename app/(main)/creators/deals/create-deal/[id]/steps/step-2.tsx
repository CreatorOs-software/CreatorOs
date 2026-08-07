"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Plus, Trash2 } from "lucide-react";
import { PLATFORM_OPTIONS, CONTENT_TYPE_OPTIONS } from "../deal-form.constants";
import type { Deliverable } from "../deal-form.schema";
import type { DealForm, DealField, StepErrors } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

interface Step2Props {
  form: DealForm;
  errors: StepErrors;
  images: File[];
  onImagesChange: (files: File[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step2({ form, errors, images, onImagesChange, onNext, onPrev }: Step2Props) {
  return (
    <div className="flex flex-col gap-0">
      {/* ── Sektion 1: Kontakt & Deliverables ─────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Rahmendaten</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Ansprechpartner und vereinbarte Deliverables.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex flex-col gap-5">
            {/* Ansprechpartner */}
            <div>
              <form.Field name="contact_person">
                {(field: DealField<"contact_person">) => (
                  <>
                    <Label htmlFor="contact_person" className="text-sm font-medium">
                      Ansprechpartner
                    </Label>
                    <Input
                      id="contact_person"
                      placeholder="z.B. Anna Müller"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            {/* Kampagnenzeitraum */}
            <div>
              <Label className="text-sm font-medium">Kampagnenzeitraum</Label>
              <div className="mt-2 flex items-center gap-3">
                <form.Field name="campaign_start">
                  {(field: DealField<"campaign_start">) => (
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="flex-1"
                    />
                  )}
                </form.Field>
                <span className="text-sm text-muted-foreground shrink-0">–</span>
                <form.Field name="campaign_end">
                  {(field: DealField<"campaign_end">) => (
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="flex-1"
                    />
                  )}
                </form.Field>
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <form.Field name="deliverables">
                {(field: DealField<"deliverables">) => {
                  const items = (field.state.value ?? []) as Deliverable[];

                  function update(index: number, patch: Partial<Deliverable>) {
                    const updated = items.map((item, i) =>
                      i === index ? { ...item, ...patch } : item,
                    );
                    field.handleChange(updated);
                  }

                  function addRow() {
                    field.handleChange([
                      ...items,
                      { count: 1, content_type: "", platform: "" },
                    ]);
                  }

                  function removeRow(index: number) {
                    field.handleChange(items.filter((_, i) => i !== index));
                  }

                  return (
                    <>
                      <Label className="text-sm font-medium">Deliverables</Label>

                      <div className="mt-2 flex flex-col gap-2">
                        {items.length > 0 && (
                          /* Column headers */
                          <div className="grid grid-cols-[56px_1fr_1fr_32px] gap-2 px-1">
                            <span className="text-xs text-muted-foreground">Anzahl</span>
                            <span className="text-xs text-muted-foreground">Content-Typ</span>
                            <span className="text-xs text-muted-foreground">Plattform</span>
                            <span />
                          </div>
                        )}

                        {items.map((item, i) => (
                          <div key={i} className="flex flex-col gap-1.5">
                            {/* Main row: count / type / platform / delete */}
                            <div className="grid grid-cols-[56px_1fr_1fr_32px] items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                value={item.count}
                                onChange={(e) =>
                                  update(i, { count: Math.max(1, Number(e.target.value)) })
                                }
                                className="text-center px-2"
                              />
                              <Select
                                value={item.content_type}
                                onValueChange={(val) => { if (val) update(i, { content_type: val }); }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Typ…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONTENT_TYPE_OPTIONS.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={item.platform}
                                onValueChange={(val) => { if (val) update(i, { platform: val }); }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Plattform…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PLATFORM_OPTIONS.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <button
                                type="button"
                                onClick={() => removeRow(i)}
                                className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Date sub-row */}
                            <div className="grid grid-cols-3 gap-2 pl-16">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">Draft-Deadline</span>
                                <Input
                                  type="date"
                                  value={item.draft_deadline ?? ""}
                                  onChange={(e) => update(i, { draft_deadline: e.target.value || null })}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">Freigabe-Deadline</span>
                                <Input
                                  type="date"
                                  value={item.freigabe_deadline ?? ""}
                                  onChange={(e) => update(i, { freigabe_deadline: e.target.value || null })}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">Live-Datum</span>
                                <Input
                                  type="date"
                                  value={item.live_date ?? ""}
                                  onChange={(e) => update(i, { live_date: e.target.value || null })}
                                  className="h-7 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRow}
                          className="mt-1 self-start gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Deliverable hinzufügen
                        </Button>
                      </div>
                    </>
                  );
                }}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 2: Konditionen ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Konditionen</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Deadline, Nutzungsrechte und Exklusivität.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            {/* Deadline */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="deadline">
                {(field: DealField<"deadline">) => (
                  <>
                    <Label htmlFor="deadline" className="text-sm font-medium">
                      Deadline
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                    {errors.deadline && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.deadline}</p>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            {/* Nutzungsrechte */}
            <div className="col-span-full">
              <form.Field name="usage_rights">
                {(field: DealField<"usage_rights">) => (
                  <>
                    <Label htmlFor="usage_rights" className="text-sm font-medium">
                      Nutzungsrechte
                    </Label>
                    <Input
                      id="usage_rights"
                      placeholder="z.B. 12 Monate, alle Kanäle"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            {/* Sperrfrist / Exklusivität */}
            <div className="col-span-full">
              <form.Field name="exclusivity">
                {(field: DealField<"exclusivity">) => (
                  <>
                    <Label htmlFor="exclusivity" className="text-sm font-medium">
                      Sperrfrist / Exklusivität
                    </Label>
                    <Input
                      id="exclusivity"
                      placeholder="z.B. 30 Tage, keine Konkurrenzprodukte"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 3: Notizen & Bilder ───────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Notizen & Bilder</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Interne Notizen und Referenzbilder für diesen Deal.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex flex-col gap-5">
            <div>
              <form.Field name="notes">
                {(field: DealField<"notes">) => (
                  <>
                    <Label htmlFor="notes" className="text-sm font-medium">
                      Notizen
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Interne Anmerkungen, Briefing-Infos…"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2 resize-none h-24"
                    />
                  </>
                )}
              </form.Field>
            </div>

            <div>
              <Label className="text-sm font-medium">Bilder</Label>
              <div className="mt-2">
                <ImageUpload
                  files={images}
                  onChange={onImagesChange}
                  maxFiles={10}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 4: Vorgaben ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Vorgaben</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Kennzeichnung, Wording und No-Gos für den Creator.
          </p>
        </div>

        <div className="sm:col-span-2">
          <form.Field name="guidelines">
            {(field) => {
              const g = (field.state.value ?? {}) as {
                labeling?: string;
                wording?: string;
                nogo?: string;
                hashtags?: string[];
                links?: string[];
              };
              function set(patch: typeof g) {
                field.handleChange({ ...g, ...patch });
              }
              return (
                <div className="flex flex-col gap-4">
                  <div>
                    <Label className="text-sm font-medium">Labeling / Kennzeichnung</Label>
                    <Input
                      placeholder="z.B. #Werbung #ad"
                      value={g.labeling ?? ""}
                      onChange={(e) => set({ labeling: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Wording</Label>
                    <Textarea
                      placeholder="Pflichtaussagen, Formulierungen…"
                      value={g.wording ?? ""}
                      onChange={(e) => set({ wording: e.target.value })}
                      className="mt-2 resize-none h-20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">No-Gos</Label>
                    <Textarea
                      placeholder="Verbotene Aussagen, Wettbewerber…"
                      value={g.nogo ?? ""}
                      onChange={(e) => set({ nogo: e.target.value })}
                      className="mt-2 resize-none h-20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Hashtags</Label>
                    <Textarea
                      placeholder="#hashtag1&#10;#hashtag2"
                      value={(g.hashtags ?? []).join("\n")}
                      onChange={(e) =>
                        set({ hashtags: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
                      }
                      className="mt-2 resize-none h-16"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Links</Label>
                    <Textarea
                      placeholder="https://link1.com&#10;https://link2.com"
                      value={(g.links ?? []).join("\n")}
                      onChange={(e) =>
                        set({ links: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
                      }
                      className="mt-2 resize-none h-16"
                    />
                  </div>
                </div>
              );
            }}
          </form.Field>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 5: Tracking-Assets ───────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Tracking-Assets</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Rabattcodes, Affiliate-Links und UTM-Parameter.
          </p>
        </div>

        <div className="sm:col-span-2">
          <form.Field name="tracking_assets">
            {(field) => {
              const t = (field.state.value ?? {}) as {
                discount_code?: string;
                affiliate_link?: string;
                utm_params?: string;
              };
              function set(patch: typeof t) {
                field.handleChange({ ...t, ...patch });
              }
              return (
                <div className="flex flex-col gap-4">
                  <div>
                    <Label className="text-sm font-medium">Rabattcode</Label>
                    <Input
                      placeholder="CREATOR10"
                      value={t.discount_code ?? ""}
                      onChange={(e) => set({ discount_code: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Affiliate-Link</Label>
                    <Input
                      placeholder="https://…"
                      value={t.affiliate_link ?? ""}
                      onChange={(e) => set({ affiliate_link: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">UTM-Parameter</Label>
                    <Input
                      placeholder="utm_source=creator&utm_medium=social"
                      value={t.utm_params ?? ""}
                      onChange={(e) => set({ utm_params: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>
              );
            }}
          </form.Field>
        </div>
      </div>

      <StepNav onPrev={onPrev} onNext={onNext} submitLabel="Deal anlegen" />
    </div>
  );
}
