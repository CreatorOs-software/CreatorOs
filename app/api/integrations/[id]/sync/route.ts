import { IntegrationService, IntegrationNotFoundError } from "@/domains/integrations";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await IntegrationService.sync(id);
    return Response.json(result);
  } catch (e) {
    if (e instanceof IntegrationNotFoundError)
      return Response.json({ error: "Not found" }, { status: 404 });
    return toErrorResponse(e);
  }
}
