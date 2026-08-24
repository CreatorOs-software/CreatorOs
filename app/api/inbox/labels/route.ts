import { CommunicationService, CommunicationError } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST(request: Request) {
  try {
    const { name, color } = await request.json();
    if (!name?.trim()) return Response.json({ error: "Name fehlt" }, { status: 400 });
    const label = await CommunicationService.createLabel(name.trim(), color ?? "#006FFE");
    return Response.json(label);
  } catch (e) {
    if (e instanceof CommunicationError) return Response.json({ error: e.message }, { status: 400 });
    return toErrorResponse(e);
  }
}
