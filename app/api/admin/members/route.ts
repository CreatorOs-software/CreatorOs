import { MemberService } from "@/domains/members";
import { toErrorResponse } from "@/domains/auth";

export async function GET() {
  try {
    const members = await MemberService.getMembers();
    return Response.json({ members });
  } catch (e) {
    return toErrorResponse(e);
  }
}
