import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const SELECT = `
  id, title, notes, start_at, end_at, type, location, creator_id, attendee_ids,
  creators:creator_id (full_name, initials, color)
`;

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["shoot", "travel", "deadline", "brand", "internal", "posting"]).optional(),
  start_at: z.string().optional(),
  end_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  creator_id: z.string().nullable().optional(),
  deal_id: z.string().nullable().optional(),
  attendee_ids: z.array(z.string()).optional(),
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

    const { data: event, error } = await supabase
      .from("events")
      .update(parsed.data)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select(SELECT)
      .single();

    if (error) throw error;

    return Response.json({ event });
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
      .from("events")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
