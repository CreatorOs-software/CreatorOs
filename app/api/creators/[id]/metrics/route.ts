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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split("T")[0]!;
    const toDate = new Date().toISOString().split("T")[0]!;

    const { accounts, metrics } = await service.getMetricsForCreator(creatorId, fromDate, toDate);
    return Response.json({ accounts, metrics });
  } catch (e) {
    return toErrorResponse(e);
  }
}
