import { z } from "zod";

// ── Rights / Rechte ─────────────────────────────────────────
export const rightsSchema = z.object({
  scope: z.enum(["nur_gepostet", "inkl_rohmaterial"]).nullable().optional(),
  territory: z.enum(["DACH", "EU", "weltweit", "individuell"]).nullable().optional(),
  territory_custom: z.string().nullable().optional(),
  duration_value: z.number().nullable().optional(),
  duration_unlimited: z.boolean().optional(),
  duration_unit: z.enum(["wochen", "monate", "jahre", "unbegrenzt"]).nullable().optional(),
  duration_start_type: z.enum(["live_gang", "kampagnenstart"]).nullable().optional(),
  live_gang_date: z.string().nullable().optional(),
  channels: z.array(z.string()).optional(),
  modifications: z.array(z.string()).optional(),
  transferability: z.array(z.string()).optional(),
  extension: z.object({
    duration_value: z.number().nullable().optional(),
    duration_unit: z.string().optional(),
    price: z.number().nullable().optional(),
    deadline: z.string().nullable().optional(),
  }).nullable().optional(),
});

export const exclusivityInfoSchema = z.object({
  category: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  competitors: z.array(z.string()).optional(),
});

export const embargoSchema = z.object({
  date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const whitelistingSchema = z.object({
  spark_expiry: z.string().nullable().optional(),
  meta_expiry: z.string().nullable().optional(),
});

// ── Deliverables ────────────────────────────────────────────
export const deliverableSchema = z.object({
  count: z.number().min(1, "Mindestens 1"),
  content_type: z.string().min(1, "Content-Typ auswählen"),
  platform: z.string().min(1, "Plattform auswählen"),
  draft_deadline: z.string().nullable().optional(),
  freigabe_deadline: z.string().nullable().optional(),
  live_date: z.string().nullable().optional(),
  // Per-deliverable conditions
  deadline: z.string().nullable().optional(),
  // Per-deliverable rights (replaces top-level usage_rights/exclusivity strings)
  rights: rightsSchema.optional(),
  exclusivity_info: exclusivityInfoSchema.optional(),
  embargo: embargoSchema.optional(),
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
  paid_at: z.string().optional(), // ISO date string, set when marked as paid
});

export type PaymentItem = z.infer<typeof paymentItemSchema>;

// ── Guidelines / Tracking ───────────────────────────────────
export const guidelinesSchema = z.object({
  labeling: z.string().optional(),
  wording: z.string().optional(),
  nogo: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  // links removed
});

export const trackingAssetsSchema = z.object({
  discount_code: z.string().optional(),
  affiliate_links: z.array(z.string()).optional(),
  utm_params: z.string().optional(),
});

// ── Full form schema ────────────────────────────────────────
export const dealFormSchema = z.object({
  // Step 1 – Basisdaten
  title: z.string().min(1, "Kampagnen-Titel ist erforderlich"),
  brand_id: z.string(),
  product: z.string(),
  creator_id: z.string().min(1, "Creator ist erforderlich"),
  // Step 1 – Rahmendaten
  contact_person: z.string(),
  campaign_start: z.string(),
  campaign_end: z.string(),
  // Step 1 – Bearbeiter & Dokumente
  assignee_id: z.string().optional(),
  documents: z.array(z.object({ name: z.string(), url: z.string(), size: z.number() })).optional(),
  // Step 2 – Notizen & Tracking
  notes: z.string(),
  guidelines: guidelinesSchema.optional(),
  tracking_assets: trackingAssetsSchema.optional(),
  // Step 3 – Deliverables
  deliverables: z.array(deliverableSchema),
  // Step 4 – Zahlung
  fee: z.number().min(0),
  payment_items: z.array(paymentItemSchema).min(1),
  // Backwards compat fields (not exposed in form, kept for old data)
  platform: z.string().optional(),
  deadline: z.string().optional(),
  usage_rights: z.string().optional(),
  exclusivity: z.string().optional(),
  // Top-level rights/exclusivity (kept for backwards compat and whitelisting)
  rights: rightsSchema.optional(),
  exclusivity_info: exclusivityInfoSchema.optional(),
  embargo: embargoSchema.optional(),
  whitelisting: whitelistingSchema.optional(),
  contract_status: z.string().optional(),
  contract_date: z.string().optional(),
  contract_url: z.string().optional(),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

// ── Per-step validation schemas ─────────────────────────────
export const STEP_SCHEMAS = {
  1: z.object({
    title: z.string().min(1, "Kampagnen-Titel ist erforderlich"),
    brand_id: z.string(),
    product: z.string(),
    contact_person: z.string(),
    campaign_start: z.string(),
    campaign_end: z.string(),
    assignee_id: z.string().optional(),
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
