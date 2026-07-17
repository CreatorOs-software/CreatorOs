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
      goal_value,
      goal_type,
      goal_period,
      weitere_ziele,
      min_kooperation_betrag,
      wunsche_anforderungen,
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
      goal_value: goal_value ?? null,
      goal_type: goal_type || null,
      goal_period: goal_period || null,
      weitere_ziele: weitere_ziele || null,
      min_kooperation_betrag: min_kooperation_betrag ?? null,
      wunsche_anforderungen: wunsche_anforderungen || null,
      followers: followers || null,
      monthly_revenue: monthly_revenue || 0,
      status: status || "active",
      platforms: platforms || [],
      color,
      initials,
      rates: [],
      dream_brands: [],
      wish_themes: [],
      no_go: [],
    });

    return Response.json({ creator }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
