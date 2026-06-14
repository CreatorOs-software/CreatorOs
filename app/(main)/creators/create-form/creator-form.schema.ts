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
  niche: z.string(),
  bio: z.string(),
  status: z.enum(["active", "on-break", "inactive"]),
  platforms: z.array(z.string()),
  followers: z.string(),
  monthly_revenue: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), {
      message: "Muss eine positive Zahl sein",
    }),
});

export type CreatorFormValues = z.infer<typeof creatorFormSchema>;

// Which fields belong to each step — used for scoped validation
export const STEP_FIELDS = {
  1: ["vorname", "nachname", "handle", "email", "street", "postal_code", "city", "country"],
  2: ["niche", "bio", "status"],
  3: ["platforms", "followers", "monthly_revenue"],
  4: [],
} as const satisfies Record<number, (keyof CreatorFormValues)[]>;

// Zod schemas per step — extra fields are stripped (not errored)
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
    niche: z.string(),
    bio: z.string(),
    status: z.enum(["active", "on-break", "inactive"]),
  }),
  3: z.object({
    platforms: z.array(z.string()),
  }),
  4: z.object({}),
};
