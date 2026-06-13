import { MemberService } from "@/domains/members";
import { toErrorResponse } from "@/domains/auth";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return Response.json({ error: "Token fehlt" }, { status: 400 });
    await MemberService.acceptInvitation(token);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
