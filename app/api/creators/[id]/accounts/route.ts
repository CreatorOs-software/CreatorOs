import { NextRequest } from "next/server";
import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { SocialAccountService } from "@/domains/social-accounts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: creatorId } = await params;
    const { supabase } = await getAuthContext();
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
