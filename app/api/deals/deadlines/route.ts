import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/auth-context";
import { DealService } from "@/domains/deals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deadlines = await DealService.getDeadlines({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return Response.json({ deadlines });
  } catch (e) {
    return toErrorResponse(e);
  }
}
