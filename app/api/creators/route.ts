import { CreatorService } from "@/domains/creators";
import { toErrorResponse } from "@/lib/auth-context";

export async function GET() {
  try {
    const data = await CreatorService.getPageData();
    return Response.json(data);
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      full_name,
      handle,
      niche,
      followers,
      monthly_revenue,
      status,
      platforms,
      color,
      initials,
    } = body;

    const creator = await CreatorService.create({
      full_name,
      handle: handle || null,
      niche: niche || null,
      followers: followers || null,
      monthly_revenue: monthly_revenue || 0,
      status: status || "active",
      platforms: platforms || [],
      color,
      initials,
    });

    return Response.json({ creator }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
