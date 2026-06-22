import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const { supabase } = await getAuthContext();

    const { data: deals, error } = await supabase
      .from("deals")
      .select(`
        id, title, budget, status, priority, platform, deadline,
        campaign_type, deliverables, description, created_at,
        brands(company_name, color, short_code, contact_name, contact_email)
      `)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({ deals: deals ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}
