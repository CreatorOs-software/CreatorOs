"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@talentos/ui";
import type {
  CreatorForm,
  CreatorField,
  StepErrors,
} from "../creator-form.types";
import type { CreatorGoalFormValue } from "../creator-form.schema";
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
            <div className="col-span-full">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-medium">Ziele</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Erfasse beliebig viele messbare Ziele.
                  </p>
                </div>
              </div>

              <form.Field name="goals" mode="array">
                {(field: CreatorField<"goals">) => {
                  const updateGoal = (
                    index: number,
                    key: keyof CreatorGoalFormValue,
                    value: string,
                  ) => {
                    field.handleChange(
                      field.state.value.map((goal, goalIndex) =>
                        goalIndex === index ? { ...goal, [key]: value } : goal,
                      ) as CreatorGoalFormValue[],
                    );
                  };

                  return (
                    <div className="mt-3 space-y-3">
                      {field.state.value.map((goal, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-border-light bg-muted/20 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between sm:hidden">
                            <span className="text-xs font-medium text-muted-foreground">
                              Ziel {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              aria-label={`Ziel ${index + 1} entfernen`}
                              onClick={() => field.removeValue(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.25rem]">
                            <Input
                              type="number"
                              min={0}
                              placeholder="z. B. 5000"
                              aria-label={`Wert für Ziel ${index + 1}`}
                              value={goal.value}
                              onChange={(event) => updateGoal(index, "value", event.target.value)}
                            />
                            <Select
                              value={goal.type || undefined}
                              onValueChange={(value) => updateGoal(index, "type", value)}
                            >
                              <SelectTrigger aria-label={`Typ für Ziel ${index + 1}`}>
                                <SelectValue placeholder="Ziel-Typ…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="umsatz">Umsatz (€)</SelectItem>
                                <SelectItem value="kooperationen">Kooperationen</SelectItem>
                                <SelectItem value="post">Posts</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={goal.period || undefined}
                              onValueChange={(value) => updateGoal(index, "period", value)}
                            >
                              <SelectTrigger aria-label={`Zeitraum für Ziel ${index + 1}`}>
                                <SelectValue placeholder="Zeitraum…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30_tage">30 Tage</SelectItem>
                                <SelectItem value="3_monate">3 Monate</SelectItem>
                                <SelectItem value="1_jahr">1 Jahr</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="hidden text-muted-foreground hover:text-destructive sm:inline-flex"
                              aria-label={`Ziel ${index + 1} entfernen`}
                              onClick={() => field.removeValue(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {errors.goals ? (
                        <p data-field-error className="text-xs text-destructive">
                          {errors.goals}
                        </p>
                      ) : null}

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => field.pushValue({ value: "", type: "", period: "" })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ziel hinzufügen
                      </Button>
                    </div>
                  );
                }}
              </form.Field>
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
                      <p data-field-error className="mt-1.5 text-xs text-destructive">
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
                      <p data-field-error className="mt-1.5 text-xs text-destructive">
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
