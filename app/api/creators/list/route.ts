import { CreatorService } from "@/domains/creators";
import { toErrorResponse } from "@/domains/auth";

export async function GET() {
  try {
    const creators = await CreatorService.getListData();
    return Response.json({ creators });
  } catch (e) {
    return toErrorResponse(e);
  }
}
