import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const SELECT = `
  id, title, content, creator_id, brand_id, created_at, updated_at
`;

const patchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  creator_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
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
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from("notes")
      .update(parsed.data)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select(SELECT)
      .single();

    if (error) throw error;

    return Response.json({ note });
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
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
