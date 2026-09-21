import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { NotificationService } from "@/domains/notifications";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("dismiss") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("read"), unread: z.boolean() }),
  z.object({ action: z.literal("acknowledge") }),
  z.object({ action: z.literal("snooze"), until: z.string().datetime() }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const notification = parsed.data.action === "dismiss"
      ? await NotificationService.dismiss(id)
      : await NotificationService.updateInteraction(
          id,
          parsed.data.action === "read"
            ? { type: "read", unread: parsed.data.unread }
            : parsed.data.action === "snooze"
              ? { type: "snooze", until: parsed.data.until }
              : { type: parsed.data.action },
        );
    return Response.json({ notification });
  } catch (e) {
    return toErrorResponse(e);
  }
}
