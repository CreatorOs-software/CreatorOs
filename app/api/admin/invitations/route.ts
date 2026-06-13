import { MemberService } from "@/domains/members";
import { toErrorResponse } from "@/domains/auth";

export async function GET() {
  try {
    const invitations = await MemberService.getInvitations();
    return Response.json({ invitations });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const invitation = await MemberService.createInvitation({
      email: body.email,
      role: body.role,
      permissions: body.permissions,
    });
    return Response.json({ invitation });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await MemberService.deleteInvitation(id);
    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
