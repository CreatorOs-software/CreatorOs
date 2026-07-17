"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CreatorForm,
  CreatorField,
  StepErrors,
} from "../creator-form.types";
import type { CreatorFormValues } from "../creator-form.schema";
import { StepNav } from "./step-nav";

interface StepZieleProps {
  form: CreatorForm;
  errors: StepErrors;
  onNext: () => void;
  onPrev: () => void;
}

export function StepZiele({ form, errors, onNext, onPrev }: StepZieleProps) {
  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Ziele & Anforderungen</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Ziele, Mindestbeträge und Wünsche des Creators.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
            {/* Ziel: Wert + Typ + Zeitraum */}
            <div className="col-span-full">
              <Label className="text-sm font-medium">Ziel</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {/* Ziel-Wert */}
                <form.Field name="goal_value">
                  {(field: CreatorField<"goal_value">) => (
                    <Input
                      type="number"
                      min={0}
                      placeholder="z. B. 5000"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  )}
                </form.Field>

                {/* Ziel-Typ */}
                <form.Field name="goal_type">
                  {(field: CreatorField<"goal_type">) => (
                    <Select
                      value={field.state.value || undefined}
                      onValueChange={(val) =>
                        field.handleChange(
                          val as CreatorFormValues["goal_type"],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ziel-Typ…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="umsatz">Umsatz (€)</SelectItem>
                        <SelectItem value="kooperationen">Kooperationen</SelectItem>
                        <SelectItem value="post">Posts</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>

                {/* Zeitraum */}
                <form.Field name="goal_period">
                  {(field: CreatorField<"goal_period">) => (
                    <Select
                      value={field.state.value || undefined}
                      onValueChange={(val) =>
                        field.handleChange(
                          val as CreatorFormValues["goal_period"],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Zeitraum…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30_tage">30 Tage</SelectItem>
                        <SelectItem value="3_monate">3 Monate</SelectItem>
                        <SelectItem value="1_jahr">1 Jahr</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
              </div>
            </div>

            {/* Weitere Ziele */}
            <div className="col-span-full">
              <form.Field name="weitere_ziele">
                {(field: CreatorField<"weitere_ziele">) => (
                  <>
                    <Label htmlFor="weitere_ziele" className="text-sm font-medium">
                      Weitere Ziele
                    </Label>
                    <Textarea
                      id="weitere_ziele"
                      placeholder="z. B. Brand-Deals mit nachhaltigen Unternehmen, YouTube Kanal aufbauen…"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2 resize-none h-20"
                    />
                  </>
                )}
              </form.Field>
            </div>

            {/* Mindest Betrag */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="min_kooperation_betrag">
                {(field: CreatorField<"min_kooperation_betrag">) => (
                  <>
                    <Label htmlFor="min_kooperation_betrag" className="text-sm font-medium">
                      Mindest­betrag pro Kooperation (€)
                    </Label>
                    <Input
                      id="min_kooperation_betrag"
                      type="number"
                      min={0}
                      placeholder="z. B. 500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                    {errors.min_kooperation_betrag && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.min_kooperation_betrag}
                      </p>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            {/* Wünsche und Anforderungen */}
            <div className="col-span-full">
              <form.Field name="wunsche_anforderungen">
                {(field: CreatorField<"wunsche_anforderungen">) => (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="wunsche_anforderungen" className="text-sm font-medium">
                        Wünsche & Anforderungen
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {field.state.value.length}/1000
                      </span>
                    </div>
                    <Textarea
                      id="wunsche_anforderungen"
                      placeholder="z. B. Keine politischen Inhalte, nur Produkte testen die zum eigenen Lifestyle passen…"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      maxLength={1000}
                      className="mt-2 resize-none h-28"
                    />
                    {errors.wunsche_anforderungen && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.wunsche_anforderungen}
                      </p>
                    )}
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}
