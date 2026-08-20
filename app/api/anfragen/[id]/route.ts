import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { AnfrageService } from "@/domains/anfragen";

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
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const anfrage = await AnfrageService.updateAnfrage(id, parsed.data);
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
    const { id } = await params;
    await AnfrageService.deleteAnfrage(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
