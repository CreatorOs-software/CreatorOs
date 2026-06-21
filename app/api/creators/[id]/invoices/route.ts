import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const { supabase } = await getAuthContext();

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, number, amount, status, issued_at, due_date, paid_at, brands(company_name, color, short_code)")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({ invoices: invoices ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}
