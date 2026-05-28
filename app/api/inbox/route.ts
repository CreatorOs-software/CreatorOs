import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.agency_id) return Response.json({ error: "No agency" }, { status: 400 });

  const { data: threads, error } = await supabase
    .from("email_threads")
    .select(
      "id, sender_email, sender_name, subject, preview, body, body_html, received_at, unread, starred, priority, integration_id, folder, gmail_thread_id",
    )
    .eq("agency_id", profile.agency_id)
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: integrations } = await supabase
    .from("email_integrations")
    .select("id, email, display_name, provider, status, creator_id")
    .eq("agency_id", profile.agency_id)
    .eq("status", "connected");

  const { data: creators } = await supabase
    .from("creators")
    .select("id, full_name, initials, color")
    .eq("agency_id", profile.agency_id);

  return Response.json({
    threads: threads ?? [],
    integrations: integrations ?? [],
    creators: creators ?? [],
  });
}
