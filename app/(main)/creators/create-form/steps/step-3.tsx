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

// Maps display labels from constants → supported OAuth platform key
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
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Social Media & Reichweite</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Plattformen und Kennzahlen des Creators
        </p>
      </div>

      <form.Field name="platforms">
        {(field: CreatorField<"platforms">) => (
          <div className="flex flex-col gap-3">
            <Label>Plattformen</Label>

            {/* Tag selector */}
            <div className="flex flex-wrap gap-2">
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
                      : "border-border-light text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Connection cards for selected platforms */}
            {field.state.value.length > 0 && (
              <div className="flex flex-col gap-2 mt-1">
                {field.state.value.map((platform: string) => {
                  const platformKey = OAUTH_SUPPORTED[platform];
                  return (
                    <div
                      key={platform}
                      className="flex items-center justify-between rounded-xl border border-border-light bg-input px-4 py-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{platform}</span>
                        {platformKey ? (
                          <span className="text-xs text-muted-foreground">
                            Verbindung per Einladungslink möglich
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Wird nach Erstellung manuell verknüpft
                          </span>
                        )}
                      </div>

                      {platformKey ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            nach Erstellung
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground">
                            manuell
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {field.state.value.some((p: string) => OAUTH_SUPPORTED[p]) && (
                  <p className="text-xs text-muted-foreground px-1">
                    Nach dem Erstellen des Creators kannst du Einladungslinks
                    generieren, über die sich der Creator direkt verbindet.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="followers">
        {(field: CreatorField<"followers">) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="followers">Follower (gesamt, optional)</Label>
            <Input
              id="followers"
              placeholder="z.B. 125000"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="monthly_revenue">
        {(field: CreatorField<"monthly_revenue">) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monthly_revenue">Monatlicher Umsatz (€, optional)</Label>
            <Input
              id="monthly_revenue"
              placeholder="z.B. 3500"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {errors.monthly_revenue && (
              <p className="text-xs text-destructive">{errors.monthly_revenue}</p>
            )}
          </div>
        )}
      </form.Field>

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}
