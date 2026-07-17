import { z } from "zod";

export const creatorFormSchema = z.object({
  vorname: z.string().min(1, "Vorname ist erforderlich"),
  nachname: z.string(),
  handle: z.string(),
  email: z
    .string()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Ungültige E-Mail-Adresse",
    }),
  street: z.string(),
  postal_code: z.string(),
  city: z.string(),
  country: z.string(),
  niche: z.array(z.string()),
  bio: z.string(),
  status: z.enum(["active", "on-break", "inactive"]),
  goal_value: z.string(),
  goal_type: z.enum(["", "umsatz", "kooperationen", "post"]),
  goal_period: z.enum(["", "30_tage", "3_monate", "1_jahr"]),
  weitere_ziele: z.string(),
  min_kooperation_betrag: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), {
      message: "Muss eine positive Zahl sein",
    }),
  wunsche_anforderungen: z
    .string()
    .max(1000, "Maximal 1000 Zeichen"),
  platforms: z.array(z.string()),
  followers: z.string(),
  monthly_revenue: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), {
      message: "Muss eine positive Zahl sein",
    }),
});

export type CreatorFormValues = z.infer<typeof creatorFormSchema>;

export const STEP_FIELDS = {
  1: ["vorname", "nachname", "handle", "email", "street", "postal_code", "city", "country"],
  2: ["niche", "bio", "status"],
  3: ["goal_value", "goal_type", "goal_period", "weitere_ziele", "min_kooperation_betrag", "wunsche_anforderungen"],
  4: ["platforms", "followers", "monthly_revenue"],
  5: [],
} as const satisfies Record<number, (keyof CreatorFormValues)[]>;

export const STEP_SCHEMAS = {
  1: z.object({
    vorname: z.string().min(1, "Vorname ist erforderlich"),
    nachname: z.string(),
    handle: z.string(),
    email: z
      .string()
      .min(1, "Email ist Pflicht")
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: "Ungültige E-Mail-Adresse",
      }),
    street: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country: z.string(),
  }),
  2: z.object({
    niche: z.array(z.string()),
    bio: z.string(),
    status: z.enum(["active", "on-break", "inactive"]),
  }),
  3: z.object({
    wunsche_anforderungen: z.string().max(1000, "Maximal 1000 Zeichen"),
    min_kooperation_betrag: z
      .string()
      .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), {
        message: "Muss eine positive Zahl sein",
      }),
  }),
  4: z.object({
    platforms: z.array(z.string()),
  }),
  5: z.object({}),
};
