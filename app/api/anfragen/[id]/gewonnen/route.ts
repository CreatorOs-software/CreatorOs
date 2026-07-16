import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

// POST /api/anfragen/[id]/gewonnen
// Converts a won inquiry into a confirmed deal.
// Pre-fills deal from inquiry data; user edits the rest via the edit form.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: anfrageId } = await params;
    const { supabase, agencyId } = await getAuthContext();

    // Fetch anfrage
    const { data: anfrage, error: fetchError } = await supabase
      .from("anfragen")
      .select("*")
      .eq("id", anfrageId)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !anfrage) {
      return Response.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
    }

    if (anfrage.linked_deal_id) {
      return Response.json({ deal_id: anfrage.linked_deal_id });
    }

    const brandName = anfrage.brands?.company_name ?? anfrage.brand_name ?? "Unbekannte Brand";
    const title = anfrage.format
      ? `${brandName} – ${anfrage.format}`
      : brandName;

    // Create deal in "confirmed" status
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        agency_id: agencyId,
        creator_id: anfrage.creator_id,
        brand_id: anfrage.brand_id ?? null,
        title,
        platform: null,
        budget: anfrage.budget_offer ?? anfrage.budget_requested ?? 0,
        contact_person: anfrage.contact_person ?? null,
        description: anfrage.notes ?? null,
        status: "confirmed",
        deliverables: [],
        payment_items: [],
      })
      .select("id")
      .single();

    if (dealError) throw dealError;

    // Mark anfrage as won and link to deal
    const { error: updateError } = await supabase
      .from("anfragen")
      .update({ status: "gewonnen", linked_deal_id: deal.id })
      .eq("id", anfrageId)
      .eq("agency_id", agencyId);

    if (updateError) throw updateError;

    return Response.json({ deal_id: deal.id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
