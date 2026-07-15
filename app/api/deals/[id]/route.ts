import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const patchSchema = z.object({
  status: z.string().optional(),
  title: z.string().optional(),
  brand_id: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  creator_id: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  deliverables: z.array(z.any()).optional(),
  deadline: z.string().nullable().optional(),
  usage_rights: z.string().nullable().optional(),
  exclusivity: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  budget: z.number().optional(),
  payment_items: z.array(z.any()).optional(),
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId)
      .eq("agency_id", agencyId);

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .update(parsed.data)
      .eq("id", dealId)
      .eq("agency_id", agencyId)
      .select("id, status")
      .single();

    if (error) throw error;

    return Response.json({ deal });
  } catch (e) {
    return toErrorResponse(e);
  }
}
