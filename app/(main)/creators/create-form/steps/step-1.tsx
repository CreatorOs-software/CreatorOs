import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreatorForm, CreatorField, StepErrors } from "../creator-form.types";
import { StepNav } from "./step-nav";

interface Step1Props {
  form: CreatorForm;
  errors: StepErrors;
  onNext: () => void;
}

export function Step1({ form, errors, onNext }: Step1Props) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Grundinformationen</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Name und Kontakt des neuen Creators
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="vorname">
          {(field: CreatorField<"vorname">) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vorname">Vorname *</Label>
              <Input
                id="vorname"
                placeholder="z.B. Lena"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {errors.vorname && (
                <p className="text-xs text-destructive">{errors.vorname}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="nachname">
          {(field: CreatorField<"nachname">) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nachname">Nachname</Label>
              <Input
                id="nachname"
                placeholder="z.B. Müller"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="handle">
        {(field: CreatorField<"handle">) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              placeholder="@lenamueller"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="email">
        {(field: CreatorField<"email">) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder="lena@example.com"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>
        )}
      </form.Field>

      <StepNav onNext={onNext} />
    </div>
  );
}
