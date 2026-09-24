import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type EmailLabelContext = {
  email: { subject: string; body: string };
  creators: Array<{ id: string; full_name: string; niche: string[] }>;
  mailbox_creator_id: string | null;
};

export async function buildEmailLabelContext(
  payload: { email_thread_id: string; integration_id: string },
  agencyId: string,
  db: SupabaseClient,
): Promise<EmailLabelContext> {
  const [emailRes, creatorsRes, integrationRes] = await Promise.all([
    db.from("email_threads").select("subject, body").eq("id", payload.email_thread_id).eq("agency_id", agencyId).single(),
    db.from("creators").select("id, full_name, niche").eq("agency_id", agencyId).eq("status", "active").limit(50),
    db.from("email_integrations").select("creator_id").eq("id", payload.integration_id).eq("agency_id", agencyId).maybeSingle(),
  ]);

  if (emailRes.error) throw new Error(`email label context: ${emailRes.error.message}`);
  if (creatorsRes.error) throw new Error(`email label creators: ${creatorsRes.error.message}`);

  return {
    email: { subject: emailRes.data.subject, body: (emailRes.data.body ?? "").slice(0, 3000) },
    creators: (creatorsRes.data ?? []).map((creator) => ({
      id: creator.id,
      full_name: creator.full_name,
      niche: Array.isArray(creator.niche) ? creator.niche : [],
    })),
    mailbox_creator_id: integrationRes.data?.creator_id ?? null,
  };
}
