import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/auth-context";
import { DealService, DealError } from "@/domains/deals";

// POST /api/anfragen/[id]/gewonnen
// Converts a won inquiry into a confirmed deal.
// Pre-fills deal from inquiry data; user edits the rest via the edit form.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: anfrageId } = await params;
    const result = await DealService.createFromAnfrage(anfrageId);
    return Response.json({ deal_id: result.deal_id }, { status: 201 });
  } catch (e) {
    if (e instanceof DealError) {
      return Response.json({ error: e.message }, { status: 404 });
    }
    return toErrorResponse(e);
  }
}
