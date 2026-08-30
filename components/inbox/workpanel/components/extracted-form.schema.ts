import type { DeepValue, FieldApi, ReactFormExtendedApi } from "@tanstack/react-form";
import { z } from "zod";

export const extractedDeliverableSchema = z.object({
  count: z.number().min(1),
  content_type: z.string().min(1, "Content-Typ wählen"),
  platform: z.string().min(1, "Plattform wählen"),
  draft_deadline: z.string(),
  freigabe_deadline: z.string(),
  live_date: z.string(),
});

export const extractedFormSchema = z.object({
  creatorId: z.string().min(1, "Bitte einen Creator zuordnen"),
  brand: z.string().min(1, "Bitte eine Brand auswählen"),
  contact: z.string(),
  product: z.string(),
  budget: z.number().nullable(),
  period: z.string(),
  campaign_start: z.string(),
  campaign_end: z.string(),
  deliverables: z.array(extractedDeliverableSchema),
});

export type ExtractedFormValues = z.infer<typeof extractedFormSchema>;

export type ExtractedForm = ReactFormExtendedApi<
  ExtractedFormValues,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any, any, any, any, any, any, any, any, any, any, any
>;

export type ExtractedField<TName extends keyof ExtractedFormValues & string> = FieldApi<
  ExtractedFormValues,
  TName,
  DeepValue<ExtractedFormValues, TName>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any
>;

export type ExtractedErrors = Partial<Record<keyof ExtractedFormValues, string>>;

/** Runs the schema and returns the first message per top-level field. */
export function collectErrors(values: unknown): ExtractedErrors {
  const res = extractedFormSchema.safeParse(values);
  if (res.success) return {};
  const errors: ExtractedErrors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof ExtractedFormValues | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
