import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { NotificationService } from "@/domains/notifications";

const muteSchema = z.object({
  scopeType: z.enum(["VORGANG", "CREATOR"]),
  scopeKey: z.string().min(1),
});

export async function GET() {
  try {
    const mutes = await NotificationService.listMutes();
    return Response.json({ mutes });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = muteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const mute = await NotificationService.mute(parsed.data);
    return Response.json({ mute }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const parsed = muteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    await NotificationService.unmute(parsed.data);
    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
