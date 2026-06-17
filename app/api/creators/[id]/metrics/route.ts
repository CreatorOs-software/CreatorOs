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

    const accounts = await service.getAccountsForCreator(creatorId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
    const toDate = new Date().toISOString().split("T")[0];

    const metricsResults = await Promise.all(
      accounts.map(async (account) => {
        const [{ data: current }, { data: daily }] = await Promise.all([
          supabase
            .from("creator_account_metrics_current")
            .select("*")
            .eq("creator_account_id", account.id)
            .maybeSingle(),
          supabase
            .from("creator_account_metrics_daily")
            .select("*")
            .eq("creator_account_id", account.id)
            .gte("date", fromDate)
            .lte("date", toDate)
            .order("date", { ascending: true }),
        ]);

        return { accountId: account.id, current: current ?? null, daily: daily ?? [] };
      }),
    );

    const metrics: Record<string, { current: unknown; daily: unknown[] }> = {};
    for (const r of metricsResults) {
      metrics[r.accountId] = { current: r.current, daily: r.daily };
    }

    return Response.json({ accounts, metrics });
  } catch (e) {
    return toErrorResponse(e);
  }
}
