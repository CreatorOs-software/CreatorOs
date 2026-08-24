import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { EventService } from "@/domains/events";

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
  all_day: z.boolean().optional(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const event = await EventService.updateEvent(id, parsed.data);
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
    await EventService.deleteEvent(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
