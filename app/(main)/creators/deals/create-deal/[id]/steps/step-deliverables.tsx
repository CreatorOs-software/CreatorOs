"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Trash2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM_OPTIONS, CONTENT_TYPE_OPTIONS } from "../deal-form.constants";
import type { Deliverable } from "../deal-form.schema";
import type { DealForm, DealField, StepErrors } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

// ── Types ─────────────────────────────────────────────────────────────────────

type RightsObj = {
  scope?: "nur_gepostet" | "inkl_rohmaterial" | null;
  territory?: "DACH" | "EU" | "weltweit" | "individuell" | null;
  territory_custom?: string | null;
  duration_value?: number | null;
  duration_unlimited?: boolean;
  duration_unit?: "wochen" | "monate" | "jahre" | "unbegrenzt" | null;
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

type ExclusivityObj = {
  category?: string | null;
  end_date?: string | null;
  competitors?: string[];
};

type EmbargoObj = {
  date?: string | null;
  notes?: string | null;
};

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

// ── Toggle Chip ───────────────────────────────────────────────────────────────

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

// ── Sub-section header inside a deliverable card ──────────────────────────────

function SubSection({
  title,
  onSelectAll,
  defaultOpen = false,
  children,
}: {
  title: string;
  onSelectAll?: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border-light pt-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 group"
        >
          <ChevronDown
            className={cn(
              "w-3 h-3 text-muted-foreground transition-transform duration-150",
              open && "rotate-180",
            )}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
            {title}
          </span>
        </button>
        {onSelectAll && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[10px] text-primary hover:underline underline-offset-2"
          >
            Alles auswählen
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 ml-2 pl-3 border-l-2 border-border-light">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Rights section for a single deliverable ───────────────────────────────────

function RightsSection({
  rights,
  onChange,
}: {
  rights: RightsObj;
  onChange: (patch: Partial<RightsObj>) => void;
}) {
  function set(patch: Partial<RightsObj>) {
    onChange({ ...rights, ...patch });
  }

  function toggleChannel(ch: string) {
    const channels = rights.channels ?? [];
    set({ channels: channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch] });
  }
  function toggleMod(val: string) {
    const arr = rights.modifications ?? [];
    set({ modifications: arr.includes(val) ? arr.filter((m) => m !== val) : [...arr, val] });
  }
  function toggleTransfer(val: string) {
    const arr = rights.transferability ?? [];
    set({ transferability: arr.includes(val) ? arr.filter((t) => t !== val) : [...arr, val] });
  }

  const isUnlimited = rights.duration_unlimited === true || rights.duration_unit === "unbegrenzt";

  return (
    <div className="flex flex-col gap-0">
      {/* 4.1 Umfang & Territorium */}
      <SubSection
        title="Umfang & Territorium"
        defaultOpen={false}
        onSelectAll={() => set({ scope: "inkl_rohmaterial", territory: "weltweit" })}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Umfang</Label>
            <ToggleChip
              options={["nur_gepostet", "inkl_rohmaterial"] as const}
              value={rights.scope}
              onChange={(v) => set({ scope: v })}
              labels={{ nur_gepostet: "nur gepostetes Asset", inkl_rohmaterial: "inkl. Rohmaterial" }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Territorium</Label>
            <ToggleChip
              options={["DACH", "EU", "weltweit", "individuell"] as const}
              value={rights.territory}
              onChange={(v) => set({ territory: v })}
            />
            {rights.territory === "individuell" && (
              <Input
                placeholder="Länder / Region…"
                value={rights.territory_custom ?? ""}
                onChange={(e) => set({ territory_custom: e.target.value || null })}
                className="mt-1 h-8 text-xs"
              />
            )}
          </div>
        </div>
      </SubSection>

      {/* 4.2 Laufzeit & Beginn */}
      <SubSection
        title="Laufzeit & Beginn der Laufzeit"
        defaultOpen={false}
        onSelectAll={() => set({ duration_unlimited: true, duration_unit: "unbegrenzt", duration_value: null, duration_start_type: null })}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Laufzeit</Label>
            <div className="flex flex-wrap items-center gap-2">
              {!isUnlimited && (
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={rights.duration_value ?? ""}
                  onChange={(e) => set({ duration_value: Number(e.target.value) || null })}
                  className="h-9 w-16 text-center"
                />
              )}
              <ToggleChip
                options={["wochen", "monate", "jahre", "unbegrenzt"] as const}
                value={rights.duration_unit}
                onChange={(v) => {
                  if (v === "unbegrenzt") {
                    set({ duration_unit: v, duration_unlimited: true, duration_value: null });
                  } else {
                    set({ duration_unit: v, duration_unlimited: false });
                  }
                }}
                labels={{ wochen: "Wochen", monate: "Monate", jahre: "Jahre", unbegrenzt: "Unbegrenzt" }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Beginn der Laufzeit</Label>
            <ToggleChip
              options={["live_gang", "kampagnenstart"] as const}
              value={rights.duration_start_type}
              onChange={(v) => set({ duration_start_type: v })}
              labels={{ live_gang: "ab Live-Gang", kampagnenstart: "ab Kampagnenstart" }}
            />
            {rights.duration_start_type === "live_gang" && (
              <DatePicker
                value={rights.live_gang_date ?? null}
                onChange={(v) => set({ live_gang_date: v })}
                className="mt-1"
              />
            )}
          </div>
        </div>
      </SubSection>

      {/* 4.3 Freigegebene Kanäle */}
      <SubSection
        title="Freigegebene Kanäle"
        defaultOpen={false}
        onSelectAll={() => set({ channels: [...CHANNELS_LIST] })}
      >
        <div className="flex flex-wrap gap-2">
          {CHANNELS_LIST.map((ch) => {
            const active = (rights.channels ?? []).includes(ch);
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
      </SubSection>

      {/* 4.4 Bearbeitungsrechte & Weitergabe */}
      <SubSection
        title="Bearbeitungsrechte & Weitergabe"
        defaultOpen={false}
        onSelectAll={() => set({ modifications: [...MODIFICATION_OPTIONS], transferability: [...TRANSFERABILITY_OPTIONS] })}
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Bearbeitungsrechte</Label>
            {MODIFICATION_OPTIONS.map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(rights.modifications ?? []).includes(m)}
                  onChange={() => toggleMod(m)}
                  className="rounded border-border"
                />
                <span className="text-xs">{m}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Weitergabe</Label>
            {TRANSFERABILITY_OPTIONS.map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(rights.transferability ?? []).includes(t)}
                  onChange={() => toggleTransfer(t)}
                  className="rounded border-border"
                />
                <span className="text-xs">{t}</span>
              </label>
            ))}
          </div>
        </div>
      </SubSection>

      {/* 4.5 Verlängerungsoption */}
      <SubSection
        title="Verlängerungsoption"
        defaultOpen={false}
        onSelectAll={() => set({ extension: { duration_value: 12, duration_unit: "monate", price: null, deadline: null } })}
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Dauer</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={rights.extension?.duration_value ?? ""}
                onChange={(e) => set({ extension: { ...rights.extension, duration_value: Number(e.target.value) || null } })}
                className="h-8 w-16 text-xs"
              />
              <select
                value={rights.extension?.duration_unit ?? "monate"}
                onChange={(e) => set({ extension: { ...rights.extension, duration_unit: e.target.value } })}
                className="h-8 bg-muted rounded-lg px-3 text-xs outline-none cursor-pointer border border-border"
              >
                <option value="wochen">Wochen</option>
                <option value="monate">Monate</option>
                <option value="jahre">Jahre</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Preis (€)</span>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={rights.extension?.price ?? ""}
              onChange={(e) => set({ extension: { ...rights.extension, price: Number(e.target.value) || null } })}
              className="h-8 w-24 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">Deadline Ausübung</span>
            <DatePicker
              value={rights.extension?.deadline ?? null}
              onChange={(v) => set({ extension: { ...rights.extension, deadline: v } })}
            />
          </div>
        </div>
      </SubSection>
    </div>
  );
}

// ── Exclusivity & Embargo section ─────────────────────────────────────────────

function ExclusivityEmbargoSection({
  exclusivity,
  embargo,
  onExclusivityChange,
  onEmbargoChange,
}: {
  exclusivity: ExclusivityObj;
  embargo: EmbargoObj;
  onExclusivityChange: (patch: Partial<ExclusivityObj>) => void;
  onEmbargoChange: (patch: Partial<EmbargoObj>) => void;
}) {
  function setEx(patch: Partial<ExclusivityObj>) {
    onExclusivityChange({ ...exclusivity, ...patch });
  }
  function setEm(patch: Partial<EmbargoObj>) {
    onEmbargoChange({ ...embargo, ...patch });
  }

  return (
    <div className="grid grid-cols-2 gap-4 mt-2">
      {/* Exklusivität */}
      <div className="rounded-lg border border-border-light p-3 flex flex-col gap-3">
        <p className="text-xs font-semibold">Exklusivität</p>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground">Branche / Kategorie</Label>
          <Input
            placeholder="z.B. Fitness, Beauty…"
            value={exclusivity.category ?? ""}
            onChange={(e) => setEx({ category: e.target.value || null })}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground">Bis</Label>
          <DatePicker
            value={exclusivity.end_date ?? null}
            onChange={(v) => setEx({ end_date: v })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground">Wettbewerber</Label>
          <Textarea
            placeholder="Brand 1&#10;Brand 2"
            value={(exclusivity.competitors ?? []).join("\n")}
            onChange={(e) =>
              setEx({ competitors: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
            }
            className="resize-none h-16 text-xs"
          />
        </div>
      </div>

      {/* Sperrfrist */}
      <div className="rounded-lg border border-border-light p-3 flex flex-col gap-3">
        <p className="text-xs font-semibold">Sperrfrist</p>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground">Posten ab</Label>
          <DatePicker
            value={embargo.date ?? null}
            onChange={(v) => setEm({ date: v })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] text-muted-foreground">Hinweise</Label>
          <Textarea
            placeholder="Details zur Sperrfrist…"
            value={embargo.notes ?? ""}
            onChange={(e) => setEm({ notes: e.target.value || null })}
            className="resize-none h-24 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// ── Single deliverable card ───────────────────────────────────────────────────

function DeliverableCard({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: Deliverable;
  index: number;
  onUpdate: (patch: Partial<Deliverable>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const headerLabel =
    item.content_type && item.platform
      ? `${item.count}× ${item.content_type} · ${item.platform}`
      : item.content_type
      ? `${item.count}× ${item.content_type}`
      : "Neues Deliverable";

  const rights = (item.rights ?? {}) as RightsObj;
  const exclusivity = (item.exclusivity_info ?? {}) as ExclusivityObj;
  const embargo = (item.embargo ?? {}) as EmbargoObj;

  function updateRights(patch: Partial<RightsObj>) {
    onUpdate({ rights: { ...rights, ...patch } as Deliverable["rights"] });
  }
  function updateExclusivity(patch: Partial<ExclusivityObj>) {
    onUpdate({ exclusivity_info: { ...exclusivity, ...patch } as Deliverable["exclusivity_info"] });
  }
  function updateEmbargo(patch: Partial<EmbargoObj>) {
    onUpdate({ embargo: { ...embargo, ...patch } as Deliverable["embargo"] });
  }

  return (
    <div className="rounded-xl border border-border-light bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/20">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-150",
              expanded && "rotate-180",
            )}
          />
          <span className="text-sm font-medium">{headerLabel}</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title={`Deliverable ${index + 1} löschen`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-0">
          {/* Top row: Anzahl, Content-Typ, Plattform */}
          <div className="grid grid-cols-[56px_1fr_1fr] items-center gap-2 mb-3">
            <Input
              type="number"
              min={1}
              value={item.count}
              onChange={(e) => onUpdate({ count: Math.max(1, Number(e.target.value)) })}
              className="text-center px-2"
            />
            <Select
              value={item.content_type}
              onValueChange={(val) => { if (val) onUpdate({ content_type: val }); }}
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
              onValueChange={(val) => { if (val) onUpdate({ platform: val }); }}
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
          </div>

          {/* Zeitplan */}
          <SubSection title="Zeitplan" defaultOpen={true}>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] text-muted-foreground">Draft-Deadline</Label>
                <DatePicker
                  value={item.draft_deadline ?? null}
                  onChange={(v) => onUpdate({ draft_deadline: v })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] text-muted-foreground">Freigabe-Deadline</Label>
                <DatePicker
                  value={item.freigabe_deadline ?? null}
                  onChange={(v) => onUpdate({ freigabe_deadline: v })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] text-muted-foreground">Live-Datum</Label>
                <DatePicker
                  value={item.live_date ?? null}
                  onChange={(v) => onUpdate({ live_date: v })}
                />
              </div>
            </div>
          </SubSection>

          {/* Konditionen */}
          <SubSection title="Konditionen" defaultOpen={false}>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 shrink-0">Deadline</span>
              <DatePicker
                value={item.deadline ?? null}
                onChange={(v) => onUpdate({ deadline: v })}
                className="flex-1"
              />
            </div>
          </SubSection>

          {/* Nutzungsrechte */}
          <SubSection title="Nutzungsrechte" defaultOpen={false}>
            <RightsSection rights={rights} onChange={updateRights} />
          </SubSection>

          {/* Exklusivität & Sperrfrist */}
          <SubSection title="Exklusivität & Sperrfrist" defaultOpen={false}>
            <ExclusivityEmbargoSection
              exclusivity={exclusivity}
              embargo={embargo}
              onExclusivityChange={updateExclusivity}
              onEmbargoChange={updateEmbargo}
            />
          </SubSection>
        </div>
      )}
    </div>
  );
}

// ── Step Deliverables ─────────────────────────────────────────────────────────

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
                    <p data-field-error className="text-xs text-destructive">{errors.deliverables}</p>
                  )}

                  {items.map((item, i) => (
                    <DeliverableCard
                      key={i}
                      item={item}
                      index={i}
                      onUpdate={(patch) => update(i, patch)}
                      onRemove={() => removeRow(i)}
                    />
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
