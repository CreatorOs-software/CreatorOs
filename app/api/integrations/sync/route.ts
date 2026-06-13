import { getAuthContext, toErrorResponse } from "@/lib/auth-context";
import { SocialAccountService } from "@/domains/social-accounts";
import { serviceClient } from "@/lib/supabase/service";

// Manual sync trigger — agency user initiates a resync for one account.
// Service role client is needed because platform_connections has USING (false) RLS.
export async function POST(req: Request) {
  try {
    await getAuthContext(); // auth gate — verifies the request is from a valid agency user
    const { account_id } = await req.json();

    if (!account_id) {
      return Response.json({ error: "account_id is required" }, { status: 400 });
    }

    const service = new SocialAccountService(serviceClient);
    await service.syncAccount(account_id);

    return Response.json({ ok: true, synced_at: new Date().toISOString() });
  } catch (e) {
    return toErrorResponse(e);
  }
}
