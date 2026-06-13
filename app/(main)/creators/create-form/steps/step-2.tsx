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
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Profil & Kategorie</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nische und Beschreibung des Creators
        </p>
      </div>

      <form.Field name="bio">
        {(field: CreatorField<"bio">) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Kurze Beschreibung des Creators…"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="resize-none h-20"
            />
          </div>
        )}
      </form.Field>

      <form.Field name="niche">
        {(field: CreatorField<"niche">) => (
          <div className="flex flex-col gap-1.5">
            <Label>Nische / Kategorie</Label>
            <div className="flex flex-wrap gap-2">
              {NICHE_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    field.handleChange(field.state.value === tag ? "" : tag)
                  }
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl border bg-input transition-colors",
                    field.state.value === tag
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "border-border-light text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </form.Field>

      <form.Field name="status">
        {(field: CreatorField<"status">) => (
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={field.state.value}
              onValueChange={(val) => {
                if (val) field.handleChange(val as CreatorFormValues["status"]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="on-break">Pause</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}
