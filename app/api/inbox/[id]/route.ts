import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

const ALLOWED_PATCH_KEYS = ["unread", "starred", "priority", "folder", "request_status"] as const;
type PatchKey = (typeof ALLOWED_PATCH_KEYS)[number];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const thread = await CommunicationService.getThreadBody(id);
    if (!thread) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(thread);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (
      "request_status" in body &&
      !["open", "rejected", "converted"].includes(body.request_status)
    ) {
      return Response.json({ error: "Ungültiger Anfrage-Status" }, { status: 400 });
    }

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
