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

export const extractedPaymentItemSchema = z.object({
  label: z.string().min(1, "Bezeichnung fehlt"),
  amount: z.number().nullable(),
  invoiceDate: z.string(),
  paymentTerm: z.union([z.literal(14), z.literal(30), z.literal(45)]),
});

const guidelinesShape = z.object({
  labeling: z.string(),
  wording: z.string(),
  nogo: z.string(),
  hashtags: z.array(z.string()),
});

const trackingShape = z.object({
  discountCode: z.string(),
  affiliateLinks: z.array(z.string()),
  utmParams: z.string(),
});

const baseShape = {
  contact: z.string(),
  title: z.string(),
  product: z.string(),
  budget: z.number().nullable(),
  budgetOffer: z.number().nullable(),
  fee: z.number().nullable(),
  period: z.string(),
  campaign_start: z.string(),
  campaign_end: z.string(),
  notes: z.string(),
  deliverables: z.array(extractedDeliverableSchema),
  paymentItems: z.array(extractedPaymentItemSchema),
  guidelines: guidelinesShape,
  trackingAssets: trackingShape,
};

export const extractedFormSchema = z.object({
  creatorId: z.string().min(1, "Bitte einen Creator zuordnen"),
  brand: z.string().min(1, "Bitte eine Brand auswählen"),
  ...baseShape,
});

/** Merge into an existing Anfrage — Brand/Creator already set, so not required. */
export const mergeFormSchema = z.object({
  creatorId: z.string(),
  brand: z.string(),
  ...baseShape,
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
export function collectErrors(
  values: unknown,
  opts?: { merge?: boolean },
): ExtractedErrors {
  const schema = opts?.merge ? mergeFormSchema : extractedFormSchema;
  const res = schema.safeParse(values);
  if (res.success) return {};
  const errors: ExtractedErrors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof ExtractedFormValues | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}
