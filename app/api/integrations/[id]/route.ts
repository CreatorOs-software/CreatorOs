import { IntegrationService } from "@/domains/integrations";
import { toErrorResponse } from "@/lib/auth-context";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const patch: { creator_id?: string | null; display_name?: string | null } = {};
    if ("creator_id" in body) patch.creator_id = body.creator_id ?? null;
    if ("display_name" in body) patch.display_name = body.display_name ?? null;

    await IntegrationService.patch(id, patch);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await IntegrationService.delete(id);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
