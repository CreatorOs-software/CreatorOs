import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { EventService } from "@/domains/events";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const events = await EventService.listEvents({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      creator_id: searchParams.get("creator_id") ?? undefined,
    });
    return Response.json({ events });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const event = await EventService.createEvent(parsed.data);
    return Response.json({ event }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
