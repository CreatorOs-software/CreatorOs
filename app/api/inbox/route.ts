import { CommunicationService } from "@/domains/communication";
import { toErrorResponse } from "@/lib/auth-context";

export async function GET() {
  try {
    const data = await CommunicationService.getInboxPageData();
    return Response.json(data);
  } catch (e) {
    return toErrorResponse(e);
  }
}
