import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase } = await getAuthContext();

    const { data, error } = await supabase
      .from("brand_contacts")
      .select("*")
      .eq("brand_id", id)
      .order("created_at");

    if (error) throw error;
    return Response.json({ contacts: data ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const { error: brandErr } = await supabase
      .from("brands")
      .select("id")
      .eq("id", id)
      .eq("agency_id", agencyId)
      .single();
    if (brandErr) return Response.json({ error: "Brand not found" }, { status: 404 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const { data: contact, error } = await supabase
      .from("brand_contacts")
      .insert({ brand_id: id, agency_id: agencyId, ...parsed.data })
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ contact }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
