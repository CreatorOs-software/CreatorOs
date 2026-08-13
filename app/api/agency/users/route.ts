import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, agencyId } = await getAuthContext();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, initials, color, role")
      .eq("agency_id", agencyId)
      .order("display_name");

    if (error) throw error;

    return Response.json({ users: data ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}
