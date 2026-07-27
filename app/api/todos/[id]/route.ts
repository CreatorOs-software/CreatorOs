import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

const SELECT = `
  id, title, done, due_date, priority, created_at,
  assignee:assignee_id (id, full_name, initials, color)
`;

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  done: z.boolean().optional(),
  due_date: z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["niedrig", "mittel", "hoch"]).nullable().optional(),
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

    const { data: todo, error } = await supabase
      .from("todos")
      .update(parsed.data)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select(SELECT)
      .single();

    if (error) throw error;

    return Response.json({ todo });
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
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
