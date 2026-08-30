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


export const INITIAL_VALUES: CreatorFormValues = {
  vorname: "",
  nachname: "",
  handle: "",
  email: "",
  phone: "",
  whatsapp_opt_in: false,
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
