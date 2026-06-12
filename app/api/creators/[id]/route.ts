import { CreatorService } from "@/domains/creators";
import { toErrorResponse } from "@/lib/auth-context";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const creator = await CreatorService.getById(id);
    if (!creator) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ creator });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const patch = await req.json();
    await CreatorService.patch(id, patch);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
