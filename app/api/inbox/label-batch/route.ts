import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST() {
  try {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    // Step 1: find integrations with auto_label enabled
    const { data: autoIntegrations } = await supabase
      .from("email_integrations")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("auto_label", true);

    const integrationIds = (autoIntegrations ?? []).map((i) => i.id);
    if (!integrationIds.length) return Response.json({ ok: true, queued: 0 });

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Step 2: fetch pending INBOX threads for those integrations (last 30 days)
    const { data: threads, error } = await supabase
      .from("email_threads")
      .select("id, agency_id")
      .eq("agency_id", agencyId)
      .eq("label_status", "pending")
      .eq("folder", "INBOX")
      .in("integration_id", integrationIds)
      .gte("received_at", cutoff)
      .order("received_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    if (!threads || threads.length === 0) return Response.json({ ok: true, queued: 0 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Fire all jobs without awaiting — polling in the frontend picks up results
    for (const t of threads) {
      void fetch(`${supabaseUrl}/functions/v1/execute-ai-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ email_thread_id: t.id, agency_id: t.agency_id }),
      }).catch(() => {/* best-effort */});
    }

    return Response.json({ ok: true, queued: threads.length });
  } catch (e) {
    return toErrorResponse(e);
  }
}
