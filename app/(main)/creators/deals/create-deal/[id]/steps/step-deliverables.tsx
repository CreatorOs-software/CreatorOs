"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Trash2 } from "lucide-react";
import { PLATFORM_OPTIONS, CONTENT_TYPE_OPTIONS } from "../deal-form.constants";
import type { Deliverable } from "../deal-form.schema";
import type { DealForm, DealField, StepErrors } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

interface StepDeliverablesProps {
  form: DealForm;
  errors: StepErrors;
  onNext: () => void;
  onPrev: () => void;
}

export function StepDeliverables({ form, errors, onNext, onPrev }: StepDeliverablesProps) {
  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Deliverables</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Vereinbarte Inhalte mit Zeitplan und Konditionen je Deliverable.
          </p>
        </div>

        <div className="sm:col-span-2">
          <form.Field name="deliverables">
            {(field: DealField<"deliverables">) => {
              const items = (field.state.value ?? []) as Deliverable[];

              function update(index: number, patch: Partial<Deliverable>) {
                field.handleChange(
                  items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
                );
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
                <div className="flex flex-col gap-4">
                  {errors.deliverables && (
                    <p className="text-xs text-destructive">{errors.deliverables}</p>
                  )}

                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border-light bg-card p-4 flex flex-col gap-5"
                    >
                      {/* ── Header row ─────────────────────────────── */}
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
                            <SelectValue placeholder="Content-Typ…" />
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

                      {/* ── Zeitplan ───────────────────────────────── */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                          Zeitplan
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-[11px] text-muted-foreground">
                              Draft-Deadline
                            </Label>
                            <DatePicker
                              value={item.draft_deadline ?? null}
                              onChange={(v) => update(i, { draft_deadline: v })}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-[11px] text-muted-foreground">
                              Freigabe-Deadline
                            </Label>
                            <DatePicker
                              value={item.freigabe_deadline ?? null}
                              onChange={(v) => update(i, { freigabe_deadline: v })}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label className="text-[11px] text-muted-foreground">
                              Live-Datum
                            </Label>
                            <DatePicker
                              value={item.live_date ?? null}
                              onChange={(v) => update(i, { live_date: v })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ── Konditionen ────────────────────────────── */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                          Konditionen
                        </p>
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-28 shrink-0">
                              Deadline
                            </span>
                            <DatePicker
                              value={item.deadline ?? null}
                              onChange={(v) => update(i, { deadline: v })}
                              className="flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-28 shrink-0">
                              Nutzungsrechte
                            </span>
                            <Input
                              value={item.usage_rights ?? ""}
                              onChange={(e) => update(i, { usage_rights: e.target.value })}
                              placeholder="z.B. 12 Monate, alle Kanäle"
                              className="flex-1"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-28 shrink-0">
                              Exklusivität
                            </span>
                            <Input
                              value={item.exclusivity ?? ""}
                              onChange={(e) => update(i, { exclusivity: e.target.value })}
                              placeholder="z.B. 30 Tage, keine Konkurrenz"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRow}
                    className="self-start gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Deliverable hinzufügen
                  </Button>
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
