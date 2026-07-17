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
                          <div
                            key={i}
                            className="grid grid-cols-[56px_1fr_1fr_32px] items-center gap-2"
                          >
                            {/* Anzahl */}
                            <Input
                              type="number"
                              min={1}
                              value={item.count}
                              onChange={(e) =>
                                update(i, { count: Math.max(1, Number(e.target.value)) })
                              }
                              className="text-center px-2"
                            />

                            {/* Content-Typ */}
                            <Select
                              value={item.content_type}
                              onValueChange={(val) => { if (val) update(i, { content_type: val }); }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Typ…" />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTENT_TYPE_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Plattform */}
                            <Select
                              value={item.platform}
                              onValueChange={(val) => { if (val) update(i, { platform: val }); }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Plattform…" />
                              </SelectTrigger>
                              <SelectContent>
                                {PLATFORM_OPTIONS.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Remove */}
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      <StepNav onPrev={onPrev} onNext={onNext} submitLabel="Deal anlegen" />
    </div>
  );
}
