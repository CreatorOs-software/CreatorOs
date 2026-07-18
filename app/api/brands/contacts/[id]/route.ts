import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { supabase, agencyId } = await getAuthContext();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success)
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });

    const { data: contact, error } = await supabase
      .from("brand_contacts")
      .update(parsed.data)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json({ contact });
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
    const { supabase, agencyId } = await getAuthContext();

    const { error } = await supabase
      .from("brand_contacts")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
