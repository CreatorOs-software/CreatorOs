import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const SELECT = `
  id, title, done, due_date, priority, created_at,
  assignee:assignee_id (id, full_name, initials, color)
`;

export async function GET() {
  try {
    const { supabase, agencyId } = await getAuthContext();

    // Purge completed todos older than 3 days (fire-and-forget, non-blocking)
    supabase
      .from("todos")
      .delete()
      .eq("agency_id", agencyId)
      .eq("done", true)
      .lt("updated_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .then(() => {});

    const { data: todos, error } = await supabase
      .from("todos")
      .select(SELECT)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return Response.json({ todos });
  } catch (e) {
    return toErrorResponse(e);
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  due_date: z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["niedrig", "mittel", "hoch"]).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { supabase, agencyId, userId } = await getAuthContext();

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const { data: todo, error } = await supabase
      .from("todos")
      .insert({ ...parsed.data, agency_id: agencyId, created_by: userId })
      .select(SELECT)
      .single();

    if (error) throw error;

    return Response.json({ todo }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
