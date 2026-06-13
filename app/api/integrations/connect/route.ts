import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { SocialAccountService } from "@/domains/social-accounts";

// GET accounts for a creator
export async function GET(req: Request) {
  try {
    const { supabase } = await getAuthContext();
    const url = new URL(req.url);
    const creatorId = url.searchParams.get("creator_id");

    if (!creatorId) {
      return Response.json({ error: "creator_id is required" }, { status: 400 });
    }

    const service = new SocialAccountService(supabase);
    const [accounts, invites] = await Promise.all([
      service.getAccountsForCreator(creatorId),
      service.getInvitesForCreator(creatorId),
    ]);

    return Response.json({ accounts, invites });
  } catch (e) {
    return toErrorResponse(e);
  }
}

// Disconnect a platform account
export async function DELETE(req: Request) {
  try {
    const { supabase } = await getAuthContext();
    const { account_id } = await req.json();

    if (!account_id) {
      return Response.json({ error: "account_id is required" }, { status: 400 });
    }

    const service = new SocialAccountService(supabase);
    await service.disconnectAccount(account_id);

    return Response.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
