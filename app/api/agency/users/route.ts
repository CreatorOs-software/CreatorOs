import { toErrorResponse } from "@/lib/auth-context";
import { MemberService } from "@/domains/members";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await MemberService.listUsers();
    return Response.json({ users });
  } catch (e) {
    return toErrorResponse(e);
  }
}
