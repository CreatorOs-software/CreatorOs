import type { CreatorFormValues } from "./creator-form.schema";

export const STEPS = [
  { id: 1, label: "Basisdaten" },
  { id: 2, label: "Profil" },
  { id: 3, label: "Ziele" },
  { id: 4, label: "Social Media" },
  { id: 5, label: "Prüfen" },
];

export const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Spotify",
  "OnlyFans",
  "X",
];

export const NICHE_OPTIONS = [
  "Lifestyle",
  "Fashion",
  "Beauty",
  "Food",
  "Travel",
  "Fitness",
  "Gaming",
  "Tech",
  "Business",
  "Comedy",
  "Music",
  "Education",
  "Automotive",
  "Sports",
];

export const CREATOR_COLORS = [
  "oklch(0.62 0.18 25)",
  "oklch(0.60 0.18 145)",
  "oklch(0.60 0.18 230)",
  "oklch(0.62 0.18 270)",
  "oklch(0.65 0.18 50)",
  "oklch(0.62 0.18 190)",
  "oklch(0.62 0.18 310)",
  "oklch(0.62 0.18 100)",
];

export const INITIAL_VALUES: CreatorFormValues = {
  vorname: "",
  nachname: "",
  handle: "",
  email: "",
  street: "",
  postal_code: "",
  city: "",
  country: "",
  niche: [],
  bio: "",
  status: "active",
  goal_value: "",
  goal_type: "",
  goal_period: "",
  weitere_ziele: "",
  min_kooperation_betrag: "",
  wunsche_anforderungen: "",
  platforms: [],
  followers: "",
  monthly_revenue: "",
};
