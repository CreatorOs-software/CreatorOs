import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type EmailAnalysisContext = {
  email: {
    subject:      string;
    body:         string;
    sender_email: string;
    sender_name:  string | null;
  };
  conversation: {
    is_follow_up:       boolean; // thread belongs to an existing conversation
    prior_emails_count: number;  // how many threads already in that conversation
    has_linked_anfrage: boolean; // conversation already linked to an anfrage
  };
  agency: {
    known_brands: { company_name: string; industry: string | null }[];
    creators:     { id: string; full_name: string; niche: string[]; min_budget: number | null }[];
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
      .select("subject, body, sender_email, sender_name, conversation_id")
      .eq("id", payload.email_thread_id)
      .single(),
    db
      .from("brands")
      .select("company_name, industry")
      .eq("agency_id", agencyId)
      .limit(40),
    db
      .from("creators")
      .select("id, full_name, niche, min_kooperation_betrag")
      .eq("agency_id", agencyId)
      .eq("status", "active")
      .limit(20),
  ]);

  if (emailRes.error) throw new Error(`context: email_threads – ${emailRes.error.message}`);

  const conversationId: string | null = emailRes.data.conversation_id ?? null;
  let priorEmailsCount = 0;
  let hasLinkedAnfrage = false;

  if (conversationId) {
    const [countRes, convRes] = await Promise.all([
      db
        .from("email_threads")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .neq("id", payload.email_thread_id),
      db
        .from("conversations")
        .select("anfrage_id")
        .eq("id", conversationId)
        .maybeSingle(),
    ]);
    priorEmailsCount = countRes.count ?? 0;
    hasLinkedAnfrage = !!convRes.data?.anfrage_id;
  }

  return {
    email: {
      subject:      emailRes.data.subject,
      body:         (emailRes.data.body ?? "").slice(0, 4000),
      sender_email: emailRes.data.sender_email,
      sender_name:  emailRes.data.sender_name,
    },
    conversation: {
      is_follow_up:       conversationId !== null && priorEmailsCount > 0,
      prior_emails_count: priorEmailsCount,
      has_linked_anfrage: hasLinkedAnfrage,
    },
    agency: {
      known_brands: (brandsRes.data ?? []).map((b) => ({
        company_name: b.company_name,
        industry:     b.industry ?? null,
      })),
      creators: (creatorsRes.data ?? []).map((c) => ({
        id:         c.id,
        full_name:  c.full_name,
        niche:      Array.isArray(c.niche) ? c.niche : [],
        min_budget: c.min_kooperation_betrag ?? null,
      })),
    },
  };
}
