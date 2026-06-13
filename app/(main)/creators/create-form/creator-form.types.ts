import { useForm } from "@tanstack/react-form";
import type { FieldApi } from "@tanstack/react-form";
import type { CreatorFormValues } from "./creator-form.schema";

export type CreatorForm = ReturnType<typeof useForm<CreatorFormValues>>;

// Per-field error map — populated by Zod on step advance
export type StepErrors = Partial<Record<keyof CreatorFormValues, string>>;

// Typed field helper — annotate render-prop `field` args in steps
export type CreatorField<TName extends keyof CreatorFormValues & string> = FieldApi<
  CreatorFormValues,
  TName
>;
