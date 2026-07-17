import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const patchSchema = z.object({
  brand_id: z.string().nullable().optional(),
  brand_name: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  budget_requested: z.number().nullable().optional(),
  budget_offer: z.number().nullable().optional(),
  source: z.enum(["email", "ig_dm", "whatsapp", "manual"]).optional(),
  status: z.enum(["neu", "pruefung", "angebot", "verhandlung", "zugesagt", "gewonnen", "abgelehnt"]).optional(),
  rejection_reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: anfrageId } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const { data: anfrage, error } = await supabase
      .from("anfragen")
      .update(parsed.data)
      .eq("id", anfrageId)
      .eq("agency_id", agencyId)
      .select("id, status")
      .single();

    if (error) throw error;

    return Response.json({ anfrage });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: anfrageId } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const { error } = await supabase
      .from("anfragen")
      .delete()
      .eq("id", anfrageId)
      .eq("agency_id", agencyId);

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
