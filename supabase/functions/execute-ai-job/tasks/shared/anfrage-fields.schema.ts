import { z } from "npm:zod@3";

export const deliverableSchema = z.object({
  count: z.number().int().min(1),
  content_type: z.string(),
  platform: z.string(),
  draft_deadline: z.string().nullable(),
  freigabe_deadline: z.string().nullable(),
  live_date: z.string().nullable(),
});

export const paymentItemSchema = z.object({
  label: z.string(),
  amount: z.number(),
  invoice_date: z.string().nullable(),
  payment_term: z.union([z.literal(14), z.literal(30), z.literal(45)]),
});

export const guidelinesSchema = z
  .object({
    labeling: z.string().nullable(),
    wording: z.string().nullable(),
    nogo: z.string().nullable(),
    hashtags: z.array(z.string()),
  })
  .nullable();

export const trackingAssetsSchema = z
  .object({
    discount_code: z.string().nullable(),
    affiliate_links: z.array(z.string()),
    utm_params: z.string().nullable(),
  })
  .nullable();
