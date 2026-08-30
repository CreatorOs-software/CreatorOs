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
import { DatePicker } from "@/components/ui/date-picker";
import { FormSection } from "@/components/ui/form-section";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";
import type { AnfrageSource } from "@/domains/anfragen";
import { SOURCE_OPTIONS } from "../anfrage-form.constants";
import type { AnfrageExtras } from "../anfrage-form.schema";
import type {
  AnfrageForm,
  AnfrageField,
  StepErrors,
  BrandOption,
} from "../anfrage-form.types";

interface StepBasisProps {
  form: AnfrageForm;
  errors: StepErrors;
  brands: BrandOption[];
  extras: AnfrageExtras;
  onExtrasChange: (patch: Partial<AnfrageExtras>) => void;
  onNext: () => void;
}

export function StepBasis({
  form,
  errors,
  brands,
  extras,
  onExtrasChange,
  onNext,
}: StepBasisProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* ── Herkunft ──────────────────────────────────────────── */}
      <FormSection
        title="Herkunft"
        description="Über welchen Kanal kam die Anfrage rein."
        defaultOpen={true}
      >
        <div>
          <Label className="text-sm font-medium">Quelle</Label>
          <Select
            value={extras.source}
            onValueChange={(val) => {
              if (val) onExtrasChange({ source: val as AnfrageSource });
            }}
          >
            <SelectTrigger className="mt-2 w-full sm:w-64">
              <SelectValue placeholder="Quelle auswählen" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormSection>

      {/* ── Kampagne ──────────────────────────────────────────── */}
      <FormSection
        title="Kampagne"
        description="Brand, Produkt und – falls schon bekannt – ein Titel."
        defaultOpen={true}
      >
        <div className="flex flex-col gap-4">
          <form.Field name="title">
            {(field: AnfrageField<"title">) => (
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Titel
                </Label>
                <Input
                  id="title"
                  placeholder="z.B. Sommerkollektion 2025"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="mt-2"
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field name="brand_id">
              {(field: AnfrageField<"brand_id">) => (
                <div>
                  <Label className="text-sm font-medium">Brand</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => {
                      if (val) {
                        field.handleChange(val);
                        onExtrasChange({ brand_name: "" });
                      }
                    }}
                  >
                    <SelectTrigger className="mt-2 w-full">
                      <SelectValue placeholder="Brand auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="product">
              {(field: AnfrageField<"product">) => (
                <div>
                  <Label htmlFor="product" className="text-sm font-medium">
                    Produkt
                  </Label>
                  <Input
                    id="product"
                    placeholder="z.B. Handcreme SPF50"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="mt-2"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="brand_id">
            {(field: AnfrageField<"brand_id">) =>
              field.state.value ? null : (
                <div>
                  <Label htmlFor="brand_name" className="text-sm font-medium">
                    Brand-Name <span className="text-muted-foreground">(falls nicht gelistet)</span>
                  </Label>
                  <Input
                    id="brand_name"
                    placeholder="Nike, L'Oréal, …"
                    value={extras.brand_name}
                    onChange={(e) => onExtrasChange({ brand_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
              )
            }
          </form.Field>
        </div>
      </FormSection>

      {/* ── Rahmendaten ───────────────────────────────────────── */}
      <FormSection
        title="Rahmendaten"
        description="Ansprechpartner und – falls genannt – Kampagnenzeitraum."
        defaultOpen={true}
      >
        <div className="flex flex-col gap-4">
          <form.Field name="contact_person">
            {(field: AnfrageField<"contact_person">) => (
              <div>
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
              </div>
            )}
          </form.Field>

          <form.Field name="campaign_start">
            {(startField: AnfrageField<"campaign_start">) => (
              <form.Field name="campaign_end">
                {(endField: AnfrageField<"campaign_end">) => (
                  <div>
                    <Label className="text-sm font-medium">Kampagnenzeitraum</Label>
                    <DatePicker
                      range
                      startValue={startField.state.value || null}
                      endValue={endField.state.value || null}
                      onChangeStart={(v) => startField.handleChange((v ?? "") as never)}
                      onChangeEnd={(v) => endField.handleChange((v ?? "") as never)}
                      className="mt-2"
                    />
                  </div>
                )}
              </form.Field>
            )}
          </form.Field>
        </div>
      </FormSection>

      {/* ── Budget ────────────────────────────────────────────── */}
      <FormSection
        title="Budget"
        description="Was die Brand angefragt hat und unser mögliches Gegenangebot."
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="budget_requested" className="text-sm font-medium">
              Angefragtes Budget (€)
            </Label>
            <Input
              id="budget_requested"
              inputMode="decimal"
              placeholder="5000"
              value={extras.budget_requested}
              onChange={(e) => onExtrasChange({ budget_requested: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="budget_offer" className="text-sm font-medium">
              Unser Angebot (€)
            </Label>
            <Input
              id="budget_offer"
              inputMode="decimal"
              placeholder="optional"
              value={extras.budget_offer}
              onChange={(e) => onExtrasChange({ budget_offer: e.target.value })}
              className="mt-2"
            />
          </div>
        </div>
      </FormSection>

      {errors.creator_id && (
        <p data-field-error className="text-xs text-destructive">
          {errors.creator_id}
        </p>
      )}

      <StepNav onNext={onNext} submitLabel="Anfrage anlegen" />
    </div>
  );
}
