import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const SELECT = `
  id, title, content, creator_id, brand_id, created_at, updated_at
`;

export async function GET() {
  try {
    const { supabase, agencyId } = await getAuthContext();

    const { data: notes, error } = await supabase
      .from("notes")
      .select(SELECT)
      .eq("agency_id", agencyId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return Response.json({ notes });
  } catch (e) {
    return toErrorResponse(e);
  }
}

const createSchema = z.object({
  title: z.string().default(""),
  content: z.string().default(""),
  creator_id: z.string().uuid().nullable().optional(),
  brand_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { supabase, agencyId, userId } = await getAuthContext();

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from("notes")
      .insert({ ...parsed.data, agency_id: agencyId, created_by: userId })
      .select(SELECT)
      .single();

    if (error) throw error;

    return Response.json({ note }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
