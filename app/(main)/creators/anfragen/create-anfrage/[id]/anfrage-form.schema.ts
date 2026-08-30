import { z } from "zod";
import {
  deliverableSchema,
  paymentItemSchema,
  guidelinesSchema,
  trackingAssetsSchema,
} from "@/app/(main)/creators/deals/create-deal/[id]/deal-form.schema";

export type { DealFormValues as AnfrageFormValues } from "@/app/(main)/creators/deals/create-deal/[id]/deal-form.schema";

// Anfrage-specific fields kept outside the shared deal form values.
export const anfrageExtrasSchema = z.object({
  source: z.enum(["email", "ig_dm", "whatsapp", "manual"]),
  brand_name: z.string(),
  budget_requested: z.string(),
  budget_offer: z.string(),
});

export type AnfrageExtras = z.infer<typeof anfrageExtrasSchema>;

// Per-step validation — title stays optional for an inquiry.
export const STEP_SCHEMAS = {
  1: z.object({
    title: z.string(),
    brand_id: z.string(),
    product: z.string(),
    contact_person: z.string(),
    campaign_start: z.string(),
    campaign_end: z.string(),
    creator_id: z.string().min(1, "Creator ist erforderlich"),
  }),
  2: z.object({
    notes: z.string(),
    guidelines: guidelinesSchema.optional(),
    tracking_assets: trackingAssetsSchema.optional(),
  }),
  3: z.object({
    deliverables: z.array(deliverableSchema),
  }),
  4: z.object({
    fee: z.number().min(0),
    payment_items: z.array(paymentItemSchema).min(1),
  }),
  5: z.object({}),
};
