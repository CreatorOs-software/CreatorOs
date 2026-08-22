import { SupabaseClient } from "@supabase/supabase-js";

export type EmailAnalysisContext = {
  email: {
    subject:      string;
    body:         string;
    sender_email: string;
    sender_name:  string | null;
  };
  agency: {
    known_brands: { company_name: string; industry: string | null }[];
    creators:     { full_name: string; niche: string[]; min_budget: number | null }[];
  };
};

export async function buildEmailAnalysisContext(
  payload:  { email_thread_id: string },
  agencyId: string,
  db:       SupabaseClient,
): Promise<EmailAnalysisContext> {
  const [emailRes, brandsRes, creatorsRes] = await Promise.all([
    db
      .from("email_threads")
      .select("subject, body, sender_email, sender_name")
      .eq("id", payload.email_thread_id)
      .single(),
    db
      .from("brands")
      .select("company_name, industry")
      .eq("agency_id", agencyId)
      .limit(40),
    db
      .from("creators")
      .select("full_name, niche, min_kooperation_betrag")
      .eq("agency_id", agencyId)
      .eq("status", "active")
      .limit(20),
  ]);

  if (emailRes.error) throw new Error(`context: email_threads – ${emailRes.error.message}`);

  return {
    email: {
      subject:      emailRes.data.subject,
      body:         (emailRes.data.body ?? "").slice(0, 4000),
      sender_email: emailRes.data.sender_email,
      sender_name:  emailRes.data.sender_name,
    },
    agency: {
      known_brands: (brandsRes.data ?? []).map((b) => ({
        company_name: b.company_name,
        industry:     b.industry ?? null,
      })),
      creators: (creatorsRes.data ?? []).map((c) => ({
        full_name:  c.full_name,
        niche:      Array.isArray(c.niche) ? c.niche : [],
        min_budget: c.min_kooperation_betrag ?? null,
      })),
    },
  };
}
