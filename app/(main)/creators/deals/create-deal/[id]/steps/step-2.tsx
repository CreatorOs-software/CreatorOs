"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { DatePicker } from "@/components/ui/date-picker";
import type { DealForm, DealField } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

interface Step2Props {
  form: DealForm;
  images: File[];
  onImagesChange: (files: File[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step2({ form, images, onImagesChange, onNext, onPrev }: Step2Props) {
  return (
    <div className="flex flex-col gap-0">
      {/* ── Sektion 1: Rahmendaten ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Rahmendaten</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Ansprechpartner und Kampagnenzeitraum.
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
              <form.Field name="campaign_start">
                {(startField: DealField<"campaign_start">) => (
                  <form.Field name="campaign_end">
                    {(endField: DealField<"campaign_end">) => (
                      <>
                        <Label className="text-sm font-medium">Kampagnenzeitraum</Label>
                        <DatePicker
                          range
                          startValue={startField.state.value || null}
                          endValue={endField.state.value || null}
                          onChangeStart={(v) => startField.handleChange(v ?? "")}
                          onChangeEnd={(v) => endField.handleChange(v ?? "")}
                          className="mt-2"
                        />
                      </>
                    )}
                  </form.Field>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 2: Notizen & Bilder ───────────────────────── */}
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
                <ImageUpload files={images} onChange={onImagesChange} maxFiles={10} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 3: Vorgaben ───────────────────────────────── */}
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

      {/* ── Sektion 4: Tracking-Assets ───────────────────────── */}
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
