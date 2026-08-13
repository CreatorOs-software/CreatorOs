import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

const SELECT = `
  id, title, notes, start_at, end_at, type, location, creator_id, attendee_ids, all_day, recurrence,
  creators:creator_id (full_name, initials, color)
`;

export async function GET(req: NextRequest) {
  try {
    const { supabase, agencyId } = await getAuthContext();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const creatorId = searchParams.get("creator_id");

    let query = supabase
      .from("events")
      .select(SELECT)
      .eq("agency_id", agencyId)
      .order("start_at");

    if (from) query = query.gte("start_at", from);
    if (to) query = query.lte("start_at", to);
    if (creatorId) query = query.eq("creator_id", creatorId);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ events: data ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["shoot", "travel", "deadline", "brand", "internal", "posting"]),
  start_at: z.string(),
  end_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  creator_id: z.string().nullable().optional(),
  deal_id: z.string().nullable().optional(),
  attendee_ids: z.array(z.string()).optional(),
  all_day: z.boolean().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { supabase, agencyId } = await getAuthContext();

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({ ...parsed.data, agency_id: agencyId })
      .select(SELECT)
      .single();

    if (error) throw error;

    return Response.json({ event }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
