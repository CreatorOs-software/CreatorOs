import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

const ALLOWED_PATCH_KEYS = ["unread", "starred", "priority"] as const;
type PatchKey = (typeof ALLOWED_PATCH_KEYS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const patch = Object.fromEntries(
      Object.entries(body).filter(([k]) =>
        ALLOWED_PATCH_KEYS.includes(k as PatchKey),
      ),
    ) as import("@/domains/communication").ThreadPatch;

    await CommunicationService.patchThread(id, patch);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
