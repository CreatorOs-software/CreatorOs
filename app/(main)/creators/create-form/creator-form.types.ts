import type { FieldApi, ReactFormExtendedApi, DeepValue } from "@tanstack/react-form";
import type { CreatorFormValues } from "./creator-form.schema";

// Validator slots are `any` so the type is compatible with whatever useForm() infers
// regardless of whether params are narrowed to undefined or unknown.
export type CreatorForm = ReactFormExtendedApi<
  CreatorFormValues,
  any, any, any, any, any, any, any, any, any, any, any
>;

// Per-field error map — populated by Zod on step advance
export type StepErrors = Partial<Record<keyof CreatorFormValues, string>>;

// Typed field helper — annotate render-prop `field` args in steps
export type CreatorField<TName extends keyof CreatorFormValues & string> = FieldApi<
  CreatorFormValues,
  TName,
  DeepValue<CreatorFormValues, TName>,
  any, any, any, any, any, any, any, any, any,
  any, any, any, any, any, any, any, any, any, any, any
>;
