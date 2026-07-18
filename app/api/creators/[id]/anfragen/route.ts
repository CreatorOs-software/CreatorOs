import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const postSchema = z.object({
  brand_id: z.string().nullable().optional(),
  brand_name: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  budget_requested: z.number().nullable().optional(),
  budget_offer: z.number().nullable().optional(),
  source: z.enum(["email", "ig_dm", "whatsapp", "manual"]).default("manual"),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const { supabase } = await getAuthContext();

    const { data: anfragen, error } = await supabase
      .from("anfragen")
      .select(`
        id, creator_id, brand_id, brand_name, contact_person,
        format, budget_requested, budget_offer, source, status,
        rejection_reason, notes, linked_deal_id, created_at, updated_at,
        brands(company_name, color, short_code, contact_name, contact_email)
      `)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({ anfragen: anfragen ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const { data: anfrage, error } = await supabase
      .from("anfragen")
      .insert({
        agency_id: agencyId,
        creator_id: creatorId,
        ...parsed.data,
      })
      .select("id, creator_id, brand_id, brand_name, contact_person, format, budget_requested, budget_offer, source, status, rejection_reason, notes, linked_deal_id, created_at, updated_at")
      .single();

    if (error) throw error;

    return Response.json({ anfrage }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
