import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { NotificationService } from "@/domains/notifications";

const patchSchema = z.object({ status: z.literal("DISMISSED") });

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
    const notification = await NotificationService.dismiss(id);
    return Response.json({ notification });
  } catch (e) {
    return toErrorResponse(e);
  }
}
