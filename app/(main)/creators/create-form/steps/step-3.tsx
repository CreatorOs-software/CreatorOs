import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PLATFORM_OPTIONS } from "../creator-form.constants";
import type {
  CreatorForm,
  CreatorField,
  StepErrors,
} from "../creator-form.types";
import { StepNav } from "./step-nav";

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
          <div className="flex flex-col gap-1.5">
            <Label>Plattformen</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const current = field.state.value;
                    field.handleChange(
                      current.includes(p)
                        ? current.filter((x) => x !== p)
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
          </div>
        )}
      </form.Field>

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}
