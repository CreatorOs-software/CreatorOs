import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NICHE_OPTIONS } from "../creator-form.constants";
import type { CreatorForm, CreatorField, StepErrors } from "../creator-form.types";
import type { CreatorFormValues } from "../creator-form.schema";
import { StepNav } from "./step-nav";

interface Step2Props {
  form: CreatorForm;
  errors: StepErrors;
  onNext: () => void;
  onPrev: () => void;
}

export function Step2({ form, errors, onNext, onPrev }: Step2Props) {
  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {/* Section header */}
        <div>
          <h2 className="font-semibold text-foreground">Profil & Kategorie</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Nische, Beschreibung und aktueller Status des Creators.
          </p>
        </div>

        {/* Fields */}
        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
            <div className="col-span-full">
              <form.Field name="bio">
                {(field: CreatorField<"bio">) => (
                  <>
                    <Label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="Kurze Beschreibung des Creators…"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2 resize-none h-20"
                    />
                  </>
                )}
              </form.Field>
            </div>

            <div className="col-span-full">
              <form.Field name="niche">
                {(field: CreatorField<"niche">) => (
                  <>
                    <Label className="text-sm font-medium">Nische / Kategorie</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {NICHE_OPTIONS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            field.handleChange(field.state.value === tag ? "" : tag)
                          }
                          className={cn(
                            "text-xs px-3 py-1.5 rounded-xl border transition-colors",
                            field.state.value === tag
                              ? "bg-yellow-400 text-black border-yellow-400"
                              : "border-border-light bg-input text-muted-foreground hover:text-foreground hover:border-foreground/30",
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </form.Field>
            </div>

            <div className="col-span-full sm:col-span-3">
              <form.Field name="status">
                {(field: CreatorField<"status">) => (
                  <>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => {
                        if (val) field.handleChange(val as CreatorFormValues["status"]);
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiv</SelectItem>
                        <SelectItem value="on-break">Pause</SelectItem>
                        <SelectItem value="inactive">Inaktiv</SelectItem>
                      </SelectContent>
                    </Select>
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
