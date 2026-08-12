"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { FormSection } from "@/components/ui/form-section";
import { Plus, X } from "lucide-react";
import type { DealForm } from "../deal-form.types";
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
    <div className="flex flex-col gap-4">
      {/* ── Notizen & Bilder ──────────────────────────────────── */}
      <FormSection
        title="Notizen & Bilder"
        description="Interne Notizen und Referenzbilder für diesen Deal."
        defaultOpen={true}
      >
        <div className="flex flex-col gap-5">
          <div>
            <form.Field name="notes">
              {(field) => (
                <>
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Notizen
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Interne Anmerkungen, Briefing-Infos…"
                    value={field.state.value as string}
                    onChange={(e) => field.handleChange(e.target.value as never)}
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
      </FormSection>

      {/* ── Vorgaben ──────────────────────────────────────────── */}
      <FormSection
        title="Vorgaben"
        description="Kennzeichnung, Wording und No-Gos für den Creator."
        defaultOpen={true}
      >
        <form.Field name="guidelines">
          {(field) => {
            const g = (field.state.value ?? {}) as {
              labeling?: string;
              wording?: string;
              nogo?: string;
              hashtags?: string[];
            };
            function set(patch: typeof g) {
              field.handleChange({ ...g, ...patch } as never);
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
              </div>
            );
          }}
        </form.Field>
      </FormSection>

      {/* ── Tracking-Assets ───────────────────────────────────── */}
      <FormSection
        title="Tracking-Assets"
        description="Rabattcodes, Affiliate-Links und UTM-Parameter."
        defaultOpen={true}
      >
        <form.Field name="tracking_assets">
          {(field) => {
            const t = (field.state.value ?? {}) as {
              discount_code?: string;
              affiliate_links?: string[];
              utm_params?: string;
            };
            function set(patch: typeof t) {
              field.handleChange({ ...t, ...patch } as never);
            }
            const links = t.affiliate_links ?? [];

            function addLink() {
              set({ affiliate_links: [...links, ""] });
            }
            function updateLink(i: number, val: string) {
              set({ affiliate_links: links.map((l, idx) => idx === i ? val : l) });
            }
            function removeLink(i: number) {
              set({ affiliate_links: links.filter((_, idx) => idx !== i) });
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
                  <Label className="text-sm font-medium">Affiliate-Links</Label>
                  <div className="mt-2 flex flex-col gap-2">
                    {links.map((link, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          placeholder="https://…"
                          value={link}
                          onChange={(e) => updateLink(i, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLink(i)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLink}
                      className="self-start gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Affiliate-Link hinzufügen
                    </Button>
                  </div>
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
      </FormSection>

      <StepNav onPrev={onPrev} onNext={onNext} submitLabel="Deal anlegen" />
    </div>
  );
}
