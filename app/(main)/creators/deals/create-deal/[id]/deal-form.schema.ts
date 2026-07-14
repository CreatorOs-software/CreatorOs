import { z } from "zod";

// ── Deliverables ────────────────────────────────────────────
export const deliverableSchema = z.object({
  count: z.number().min(1, "Mindestens 1"),
  content_type: z.string().min(1, "Content-Typ auswählen"),
  platform: z.string().min(1, "Plattform auswählen"),
});

export type Deliverable = z.infer<typeof deliverableSchema>;

// ── Payment items ───────────────────────────────────────────
export const paymentTermSchema = z.union([
  z.literal(14),
  z.literal(30),
  z.literal(45),
]);

export type PaymentTerm = z.infer<typeof paymentTermSchema>;

export const paymentItemSchema = z.object({
  label: z.string(),
  amount: z.number().min(0),
  invoice_date: z.string(), // "" = noch nicht gestellt
  payment_term: paymentTermSchema,
});

export type PaymentItem = z.infer<typeof paymentItemSchema>;

// ── Full form schema ────────────────────────────────────────
export const dealFormSchema = z.object({
  // Step 1 – Basisdaten
  title: z.string().min(1, "Kampagnen-Titel ist erforderlich"),
  brand_id: z.string(),
  product: z.string(),
  platform: z.string(),
  creator_id: z.string().min(1, "Creator ist erforderlich"),
  // Step 2 – Rahmendaten
  contact_person: z.string(),
  deliverables: z.array(deliverableSchema),
  deadline: z.string(),
  usage_rights: z.string(),
  exclusivity: z.string(),
  notes: z.string(),
  // Step 3 – Zahlung
  fee: z.number().min(0),
  payment_items: z.array(paymentItemSchema).min(1).max(2),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

// ── Per-step validation schemas ─────────────────────────────
export const STEP_SCHEMAS = {
  1: z.object({
    title: z.string().min(1, "Kampagnen-Titel ist erforderlich"),
    brand_id: z.string(),
    product: z.string(),
    platform: z.string(),
    creator_id: z.string().min(1, "Creator ist erforderlich"),
  }),
  2: z.object({
    contact_person: z.string(),
    deliverables: z.array(deliverableSchema),
    deadline: z.string(),
    usage_rights: z.string(),
    exclusivity: z.string(),
    notes: z.string(),
  }),
  3: z.object({
    fee: z.number().min(0),
    payment_items: z.array(paymentItemSchema).min(1),
  }),
  4: z.object({}),
};
