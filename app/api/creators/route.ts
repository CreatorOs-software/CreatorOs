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
      email,
      street,
      postal_code,
      city,
      country,
      niche,
      bio,
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
      email: email || null,
      street: street || null,
      postal_code: postal_code || null,
      city: city || null,
      country: country || null,
      niche: niche || null,
      bio: bio || null,
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
