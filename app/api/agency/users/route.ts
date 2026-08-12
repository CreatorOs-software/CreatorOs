import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export async function GET() {
  try {
    const { supabase, agencyId } = await getAuthContext();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("agency_id", agencyId)
      .order("full_name");

    if (error) throw error;

    return Response.json({ users: data ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}
