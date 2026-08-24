import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function POST(request: Request) {
  try {
    const { name, color } = await request.json();
    if (!name?.trim()) return Response.json({ error: "Name fehlt" }, { status: 400 });
    const label = await CommunicationService.findOrCreateLabel(name.trim(), color ?? "#006FFE");
    return Response.json(label);
  } catch (e) {
    return toErrorResponse(e);
  }
}
