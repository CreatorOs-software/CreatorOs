"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import type { DealForm, StepErrors } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

// ── Shared toggle chip ────────────────────────────────────────────────────────

function ToggleChip<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
            value === opt
              ? "bg-foreground text-background border-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANNELS_LIST = [
  "Creator organic",
  "Brand Repost",
  "Paid Social (Whitelisting/Spark)",
  "Website/Shop",
  "Newsletter",
  "Print",
  "OOH",
  "TV",
  "POS",
] as const;

const MODIFICATION_OPTIONS = [
  "Schnitt & Montage",
  "Farbkorrektur",
  "Text & Overlay",
  "Formatanpassung",
];

const TRANSFERABILITY_OPTIONS = [
  "Unterlizenzierung",
  "Agenturweitergabe",
  "Konzernweitergabe",
  "Sublizenz an Händler",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type RightsObj = {
  scope?: "nur_gepostet" | "inkl_rohmaterial" | null;
  territory?: "DACH" | "EU" | "weltweit" | "individuell" | null;
  territory_custom?: string | null;
  duration_value?: number | null;
  duration_unit?: "wochen" | "monate" | null;
  duration_start_type?: "live_gang" | "kampagnenstart" | null;
  live_gang_date?: string | null;
  channels?: string[];
  modifications?: string[];
  transferability?: string[];
  extension?: {
    duration_value?: number | null;
    duration_unit?: string;
    price?: number | null;
    deadline?: string | null;
  } | null;
};

type ExclusivityObj = { category?: string | null; end_date?: string | null; competitors?: string[] };
type EmbargoObj = { date?: string | null; notes?: string | null };
type WhitelistingObj = { spark_expiry?: string | null; meta_expiry?: string | null };

// ── Step 3 – Rechte & Konditionen ────────────────────────────────────────────

interface Step3RechteProps {
  form: DealForm;
  errors: StepErrors;
  onNext: () => void;
  onPrev: () => void;
}

export function Step3Rechte({ form, errors: _errors, onNext, onPrev }: Step3RechteProps) {
  return (
    <div className="flex flex-col gap-0">

      {/* ── Sektion 1: Nutzungsrechte ────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Nutzungsrechte</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Umfang, Territorium, Laufzeit und freigegebene Kanäle.
          </p>
        </div>

        <div className="sm:col-span-2">
          <form.Field name="rights">
            {(field) => {
              const r = (field.state.value ?? {}) as RightsObj;
              function set(patch: Partial<RightsObj>) {
                field.handleChange({ ...r, ...patch });
              }
              function toggleChannel(ch: string) {
                const channels = r.channels ?? [];
                set({ channels: channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch] });
              }
              function toggleMod(val: string) {
                const arr = r.modifications ?? [];
                set({ modifications: arr.includes(val) ? arr.filter((m) => m !== val) : [...arr, val] });
              }
              function toggleTransfer(val: string) {
                const arr = r.transferability ?? [];
                set({ transferability: arr.includes(val) ? arr.filter((t) => t !== val) : [...arr, val] });
              }
              return (
                <div className="flex flex-col gap-6">
                  {/* Umfang + Territorium */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Umfang</Label>
                      <ToggleChip
                        options={["nur_gepostet", "inkl_rohmaterial"] as const}
                        value={r.scope}
                        onChange={(v) => set({ scope: v })}
                        labels={{ nur_gepostet: "nur gepostetes Asset", inkl_rohmaterial: "inkl. Rohmaterial" }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Territorium</Label>
                      <ToggleChip
                        options={["DACH", "EU", "weltweit", "individuell"] as const}
                        value={r.territory}
                        onChange={(v) => set({ territory: v })}
                      />
                      {r.territory === "individuell" && (
                        <Input
                          placeholder="Länder / Region…"
                          value={r.territory_custom ?? ""}
                          onChange={(e) => set({ territory_custom: e.target.value || null })}
                          className="mt-1 h-8 text-xs"
                        />
                      )}
                    </div>
                  </div>

                  {/* Laufzeit + Beginn */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laufzeit</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={r.duration_value ?? ""}
                          onChange={(e) => set({ duration_value: Number(e.target.value) || null })}
                          className="h-9 w-16 text-center"
                        />
                        <ToggleChip
                          options={["wochen", "monate"] as const}
                          value={r.duration_unit}
                          onChange={(v) => set({ duration_unit: v })}
                          labels={{ wochen: "Wochen", monate: "Monate" }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Beginn der Laufzeit</Label>
                      <ToggleChip
                        options={["live_gang", "kampagnenstart"] as const}
                        value={r.duration_start_type}
                        onChange={(v) => set({ duration_start_type: v })}
                        labels={{ live_gang: "ab Live-Gang", kampagnenstart: "ab Kampagnenstart" }}
                      />
                      {r.duration_start_type === "live_gang" && (
                        <Input
                          type="date"
                          value={r.live_gang_date ?? ""}
                          onChange={(e) => set({ live_gang_date: e.target.value || null })}
                          className="mt-1 h-8 text-xs w-fit"
                        />
                      )}
                    </div>
                  </div>

                  {/* Kanäle */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Freigegebene Kanäle</Label>
                    <div className="flex flex-wrap gap-2">
                      {CHANNELS_LIST.map((ch) => {
                        const active = (r.channels ?? []).includes(ch);
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => toggleChannel(ch)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              active
                                ? "bg-foreground text-background border-foreground"
                                : "border-border bg-background text-foreground hover:bg-muted",
                            )}
                          >
                            <span className={cn(
                              "size-4 rounded-full border-2 flex items-center justify-center shrink-0",
                              active ? "border-background bg-background" : "border-muted-foreground",
                            )}>
                              {active && <Check className="size-2.5" strokeWidth={3} style={{ color: "hsl(var(--foreground))" }} />}
                            </span>
                            {ch}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bearbeitungsrechte + Weitergabe */}
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border-light">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Bearbeitungsrechte</Label>
                      {MODIFICATION_OPTIONS.map((m) => (
                        <label key={m} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(r.modifications ?? []).includes(m)}
                            onChange={() => toggleMod(m)}
                            className="rounded border-border"
                          />
                          <span className="text-xs">{m}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Weitergabe</Label>
                      {TRANSFERABILITY_OPTIONS.map((t) => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(r.transferability ?? []).includes(t)}
                            onChange={() => toggleTransfer(t)}
                            className="rounded border-border"
                          />
                          <span className="text-xs">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Verlängerungsoption */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-border-light">
                    <Label className="text-sm font-medium">Verlängerungsoption</Label>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Dauer</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={r.extension?.duration_value ?? ""}
                            onChange={(e) => set({ extension: { ...r.extension, duration_value: Number(e.target.value) || null } })}
                            className="h-8 w-16 text-xs"
                          />
                          <select
                            value={r.extension?.duration_unit ?? "monate"}
                            onChange={(e) => set({ extension: { ...r.extension, duration_unit: e.target.value } })}
                            className="h-8 bg-muted rounded-lg px-3 text-xs outline-none cursor-pointer border border-border"
                          >
                            <option value="wochen">Wochen</option>
                            <option value="monate">Monate</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Preis (€)</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={r.extension?.price ?? ""}
                          onChange={(e) => set({ extension: { ...r.extension, price: Number(e.target.value) || null } })}
                          className="h-8 w-24 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Deadline Ausübung</span>
                        <Input
                          type="date"
                          value={r.extension?.deadline ?? ""}
                          onChange={(e) => set({ extension: { ...r.extension, deadline: e.target.value || null } })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              );
            }}
          </form.Field>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 2: Exklusivität & Sperrfrist ─────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Exklusivität & Sperrfrist</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Branche, Zeitraum und Embargo für den Creator.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Exklusivität */}
            <div className="rounded-xl border border-border-light p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold">Exklusivität</p>
              <form.Field name="exclusivity_info">
                {(field) => {
                  const ei = (field.state.value ?? {}) as ExclusivityObj;
                  function set(patch: Partial<ExclusivityObj>) { field.handleChange({ ...ei, ...patch }); }
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground">Branche / Kategorie</Label>
                        <Input
                          placeholder="z.B. Fitness, Beauty…"
                          value={ei.category ?? ""}
                          onChange={(e) => set({ category: e.target.value || null })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground">Bis</Label>
                        <Input
                          type="date"
                          value={ei.end_date ?? ""}
                          onChange={(e) => set({ end_date: e.target.value || null })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground">Wettbewerber</Label>
                        <Textarea
                          placeholder="Brand 1&#10;Brand 2"
                          value={(ei.competitors ?? []).join("\n")}
                          onChange={(e) =>
                            set({ competitors: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
                          }
                          className="resize-none h-16 text-xs"
                        />
                      </div>
                    </div>
                  );
                }}
              </form.Field>
            </div>

            {/* Sperrfrist */}
            <div className="rounded-xl border border-border-light p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold">Sperrfrist</p>
              <form.Field name="embargo">
                {(field) => {
                  const em = (field.state.value ?? {}) as EmbargoObj;
                  function set(patch: Partial<EmbargoObj>) { field.handleChange({ ...em, ...patch }); }
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground">Posten ab</Label>
                        <Input
                          type="date"
                          value={em.date ?? ""}
                          onChange={(e) => set({ date: e.target.value || null })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] text-muted-foreground">Hinweise</Label>
                        <Textarea
                          placeholder="Details zur Sperrfrist…"
                          value={em.notes ?? ""}
                          onChange={(e) => set({ notes: e.target.value || null })}
                          className="resize-none h-24 text-xs"
                        />
                      </div>
                    </div>
                  );
                }}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 3: Whitelisting ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Whitelisting / Spark</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            TikTok Spark und Meta Business Manager Ablaufdaten.
          </p>
        </div>

        <div className="sm:col-span-2">
          <form.Field name="whitelisting">
            {(field) => {
              const wl = (field.state.value ?? {}) as WhitelistingObj;
              function set(patch: Partial<WhitelistingObj>) { field.handleChange({ ...wl, ...patch }); }
              return (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">TikTok Spark Ablauf</Label>
                    <Input
                      type="date"
                      value={wl.spark_expiry ?? ""}
                      onChange={(e) => set({ spark_expiry: e.target.value || null })}
                      className="mt-2 h-9"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium">Meta Business Manager Ablauf</Label>
                    <Input
                      type="date"
                      value={wl.meta_expiry ?? ""}
                      onChange={(e) => set({ meta_expiry: e.target.value || null })}
                      className="mt-2 h-9"
                    />
                  </div>
                </div>
              );
            }}
          </form.Field>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 4: Vertrag ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Vertrag</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Vertragsstatus, Datum und Link zum Dokument.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex flex-col gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <form.Field name="contract_status">
                {(field) => (
                  <select
                    value={(field.state.value as string) ?? "offen"}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="mt-2 h-9 w-full bg-muted rounded-lg px-3 text-sm outline-none cursor-pointer border border-border"
                  >
                    <option value="offen">Offen</option>
                    <option value="versendet">Versendet</option>
                    <option value="unterschrieben">Unterschrieben</option>
                  </select>
                )}
              </form.Field>
            </div>
            <div>
              <Label className="text-sm font-medium">Vertragsdatum</Label>
              <form.Field name="contract_date">
                {(field) => (
                  <Input
                    type="date"
                    value={(field.state.value as string) ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="mt-2"
                  />
                )}
              </form.Field>
            </div>
            <div>
              <Label className="text-sm font-medium">Vertrag URL</Label>
              <form.Field name="contract_url">
                {(field) => (
                  <Input
                    placeholder="https://…"
                    value={(field.state.value as string) ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="mt-2"
                  />
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <StepNav onPrev={onPrev} onNext={onNext} submitLabel="Deal anlegen" />
    </div>
  );
}
