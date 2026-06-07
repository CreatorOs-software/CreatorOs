import { CreatorService } from "@/domains/creators";
import { toErrorResponse } from "@/lib/auth-context";

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
