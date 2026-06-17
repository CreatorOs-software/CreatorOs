"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PLATFORM_OPTIONS } from "../creator-form.constants";
import type {
  CreatorForm,
  CreatorField,
  StepErrors,
} from "../creator-form.types";
import { StepNav } from "./step-nav";

const OAUTH_SUPPORTED: Record<string, string> = {
  YouTube: "youtube",
};

interface Step3Props {
  form: CreatorForm;
  errors: StepErrors;
  onNext: () => void;
  onPrev: () => void;
}

export function Step3({ form, errors, onNext, onPrev }: Step3Props) {
  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {/* Section header */}
        <div>
          <h2 className="font-semibold text-foreground">Social Media</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Plattformen, Reichweite und Verbindungen des Creators.
          </p>
        </div>

        {/* Fields */}
        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
            {/* Platform selector */}
            <div className="col-span-full">
              <form.Field name="platforms">
                {(field: CreatorField<"platforms">) => (
                  <>
                    <Label className="text-sm font-medium">Plattformen</Label>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {PLATFORM_OPTIONS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            const current = field.state.value;
                            field.handleChange(
                              current.includes(p)
                                ? current.filter((x: string) => x !== p)
                                : [...current, p],
                            );
                          }}
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-xl border transition-colors",
                            field.state.value.includes(p)
                              ? "bg-yellow-400 text-black border-yellow-400"
                              : "border-border-light bg-input text-muted-foreground hover:text-foreground hover:border-foreground/30",
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Connection cards for selected platforms */}
                    {field.state.value.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {field.state.value.map((platform: string) => {
                          const platformKey = OAUTH_SUPPORTED[platform];
                          return (
                            <div
                              key={platform}
                              className="flex items-center justify-between rounded-xl border border-border-light bg-input px-4 py-3"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">{platform}</span>
                                <span className="text-xs text-muted-foreground">
                                  {platformKey
                                    ? "Einladungslink nach Erstellung möglich"
                                    : "Wird manuell verknüpft"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    platformKey
                                      ? "bg-yellow-400"
                                      : "bg-muted-foreground/40",
                                  )}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {platformKey ? "OAuth" : "manuell"}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {field.state.value.some((p: string) => OAUTH_SUPPORTED[p]) && (
                          <p className="text-xs text-muted-foreground px-1 mt-0.5">
                            Nach dem Erstellen werden Einladungslinks generiert, über die
                            der Creator sein Konto direkt verbindet.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            {/* Followers */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="followers">
                {(field: CreatorField<"followers">) => (
                  <>
                    <Label htmlFor="followers" className="text-sm font-medium">
                      Follower (gesamt)
                    </Label>
                    <Input
                      id="followers"
                      placeholder="z.B. 125000"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            {/* Monthly revenue */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="monthly_revenue">
                {(field: CreatorField<"monthly_revenue">) => (
                  <>
                    <Label htmlFor="monthly_revenue" className="text-sm font-medium">
                      Monatlicher Umsatz (€)
                    </Label>
                    <Input
                      id="monthly_revenue"
                      placeholder="z.B. 3500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                    {errors.monthly_revenue && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.monthly_revenue}
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
