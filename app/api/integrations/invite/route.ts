import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { SocialAccountService } from "@/domains/social-accounts";
import { isSupported } from "@/lib/platforms/registry";

export async function POST(req: Request) {
  try {
    const { supabase, userId, agencyId } = await getAuthContext();
    const body = await req.json();
    const { creator_id, platform } = body as {
      creator_id: string;
      platform: string;
    };

    if (!creator_id || !platform) {
      return Response.json(
        { error: "creator_id and platform are required" },
        { status: 400 },
      );
    }

    if (!isSupported(platform)) {
      return Response.json(
        { error: `Platform '${platform}' does not support OAuth yet` },
        { status: 400 },
      );
    }

    const service = new SocialAccountService(supabase);
    const { invite, inviteUrl } = await service.createInvite({
      agencyId,
      creatorId: creator_id,
      platform,
      createdBy: userId,
    });

    return Response.json({ invite, invite_url: inviteUrl }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase } = await getAuthContext();
    const { invite_id } = await req.json();

    if (!invite_id) {
      return Response.json({ error: "invite_id is required" }, { status: 400 });
    }

    const service = new SocialAccountService(supabase);
    await service.revokeInvite(invite_id);

    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
