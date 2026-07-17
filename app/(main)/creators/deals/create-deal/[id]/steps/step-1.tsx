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
import { PLATFORM_OPTIONS } from "../deal-form.constants";
import type { DealForm, DealField, StepErrors, BrandOption, CreatorOption } from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

interface Step1Props {
  form: DealForm;
  errors: StepErrors;
  brands: BrandOption[];
  creators: CreatorOption[];
  onNext: () => void;
}

export function Step1({ form, errors, brands, creators, onNext }: Step1Props) {
  return (
    <div className="flex flex-col gap-0">
      {/* ── Sektion 1: Kampagne ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Kampagne</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Titel, Brand und Produkt der Kampagne.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            {/* Kampagnen Titel */}
            <div className="col-span-full">
              <form.Field name="title">
                {(field: DealField<"title">) => (
                  <>
                    <Label htmlFor="title" className="text-sm font-medium">
                      Kampagnen-Titel <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="z.B. Sommerkollektion 2025"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                    {errors.title && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.title}</p>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            {/* Brand */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="brand_id">
                {(field: DealField<"brand_id">) => (
                  <>
                    <Label className="text-sm font-medium">Brand</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => { if (val) field.handleChange(val); }}
                      items={brands.map((b) => ({ value: b.id, label: b.company_name }))}
                    >
                      <SelectTrigger className="mt-2 w-full">
                        <SelectValue placeholder="Brand auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-sm shrink-0"
                                style={{ background: b.color }}
                              />
                              {b.company_name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </form.Field>
            </div>

            {/* Produkt */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="product">
                {(field: DealField<"product">) => (
                  <>
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
                  </>
                )}
              </form.Field>
            </div>

            {/* Plattform */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="platform">
                {(field: DealField<"platform">) => (
                  <>
                    <Label className="text-sm font-medium">Plattform</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => { if (val) field.handleChange(val); }}
                    >
                      <SelectTrigger className="mt-2 w-full">
                        <SelectValue placeholder="Plattform auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 2: Creator ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Creator</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Welcher Creator ist für diesen Deal verantwortlich.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="col-span-full">
              <form.Field name="creator_id">
                {(field: DealField<"creator_id">) => (
                  <>
                    <Label className="text-sm font-medium">
                      Creator <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => { if (val) field.handleChange(val); }}
                      items={creators.map((c) => ({ value: c.id, label: c.full_name }))}
                    >
                      <SelectTrigger className="mt-2 w-full">
                        <SelectValue placeholder="Creator auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {creators.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-4 h-4 rounded-sm shrink-0 inline-flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ background: c.color }}
                              >
                                {c.initials}
                              </span>
                              {c.full_name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.creator_id && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.creator_id}</p>
                    )}
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <StepNav onNext={onNext} submitLabel="Deal anlegen" />
    </div>
  );
}
