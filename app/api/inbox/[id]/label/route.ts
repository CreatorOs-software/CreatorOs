import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);

    const { data: thread, error } = await supabase
      .from("email_threads")
      .select("id, agency_id")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();

    if (error || !thread) return Response.json({ error: "Thread not found" }, { status: 404 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(`${supabaseUrl}/functions/v1/execute-ai-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ email_thread_id: id, agency_id: agencyId }),
    });

    const body = await res.json() as Record<string, unknown>;
    return Response.json(body, { status: res.ok ? 200 : 500 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
