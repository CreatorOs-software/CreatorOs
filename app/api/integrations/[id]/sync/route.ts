import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";

const serviceClient = createAdminSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Verify caller owns the integration (RLS check)
  const { data: row } = await supabase
    .from("email_integrations")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await serviceClient.functions.invoke("sync-imap", {
    body: { integration_id: id },
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const json = data as { ok?: boolean; results?: Array<{ pulled?: number; skipped?: number }> };
  const r = json?.results?.[0];
  return Response.json({ ok: true, pulled: r?.pulled ?? 0, skipped: r?.skipped ?? 0 });
}
