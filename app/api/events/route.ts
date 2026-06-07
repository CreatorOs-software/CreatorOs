import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export async function GET(req: Request) {
  try {
    const { supabase, agencyId } = await getAuthContext();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("events")
      .select(
        "id, title, type, start_at, end_at, location, creator_id, creators(full_name, initials, color)",
      )
      .eq("agency_id", agencyId)
      .order("start_at");

    if (from) query = query.gte("start_at", from);
    if (to) query = query.lte("start_at", to);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return Response.json({ events: data ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}
