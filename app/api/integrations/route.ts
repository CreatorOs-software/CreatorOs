import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";

const serviceClient = createAdminSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

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

  const { data, error } = await supabase
    .from("email_integrations")
    .select("id, email, display_name, provider, status, last_sync_at, connected_at")
    .eq("agency_id", profile.agency_id)
    .order("connected_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ integrations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.agency_id) return Response.json({ error: "No agency" }, { status: 400 });

  const body = await request.json();
  const {
    email, display_name,
    imap_host, imap_port, imap_secure,
    imap_username, imap_password,
    smtp_host, smtp_port, smtp_secure,
    provider_label,
  } = body;

  if (!email || !imap_host || !imap_password) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const provider = provider_label === "outlook" ? "outlook"
    : provider_label === "gmail" ? "gmail"
    : "imap";

  const { data: existing } = await supabase
    .from("email_integrations")
    .select("id")
    .eq("agency_id", profile.agency_id)
    .eq("email", email)
    .eq("provider", provider)
    .maybeSingle();

  const payload = {
    agency_id: profile.agency_id,
    provider,
    email,
    display_name: display_name ?? null,
    status: "connected",
    connected_at: new Date().toISOString(),
    imap_host, imap_port, imap_secure,
    imap_username: imap_username || email,
    imap_password,
    smtp_host: smtp_host ?? null,
    smtp_port: smtp_port ?? null,
    smtp_secure: smtp_secure ?? true,
    last_sync_error: null,
    created_by: user.id,
  };

  let id: string;
  if (existing) {
    const { error } = await supabase
      .from("email_integrations")
      .update(payload)
      .eq("id", existing.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    id = existing.id;
  } else {
    const { data: ins, error } = await supabase
      .from("email_integrations")
      .insert(payload)
      .select("id")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    id = ins.id;
  }

  // trigger initial sync (best-effort)
  try {
    await serviceClient.functions.invoke("sync-imap", { body: { integration_id: id } });
  } catch (e) {
    console.error("initial sync failed", e);
  }

  return Response.json({ id });
}
