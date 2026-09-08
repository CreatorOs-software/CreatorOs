import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function GET() {
  try {
    const count = await CommunicationService.getUnreadCount();
    return Response.json({ count });
  } catch (e) {
    return toErrorResponse(e);
  }
}
