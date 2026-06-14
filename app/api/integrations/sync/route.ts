import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

// Manual sync trigger — delegates to the sync-youtube Edge Function so that
// both the cron job and the manual button use identical sync logic.
export async function POST(req: Request) {
  try {
    await getAuthContext(); // auth gate — verifies the request is from a valid agency user
    const { account_id } = await req.json();

    if (!account_id) {
      return Response.json({ error: "account_id is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(`${supabaseUrl}/functions/v1/sync-youtube`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account_id }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { error: data?.error ?? "Edge Function Fehler" },
        { status: res.status },
      );
    }

    return Response.json({ ok: true, synced_at: new Date().toISOString(), result: data });
  } catch (e) {
    return toErrorResponse(e);
  }
}
