import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.agency_id)
    return Response.json({ error: "No agency" }, { status: 400 });

  const [creatorsRes, brandsRes, dealsRes, mailboxesRes] = await Promise.all([
    supabase
      .from("creators")
      .select("*")
      .eq("agency_id", profile.agency_id)
      .order("full_name"),
    supabase.from("brands").select("*").eq("agency_id", profile.agency_id),
    supabase.from("deals").select("*").eq("agency_id", profile.agency_id),
    supabase
      .from("email_integrations")
      .select("id, email, display_name, provider, creator_id")
      .eq("agency_id", profile.agency_id)
      .eq("status", "connected"),
  ]);

  return Response.json({
    creators: creatorsRes.data ?? [],
    brands: brandsRes.data ?? [],
    deals: dealsRes.data ?? [],
    mailboxes: mailboxesRes.data ?? [],
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.agency_id)
    return Response.json({ error: "No agency" }, { status: 400 });

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

  const { data, error } = await supabase
    .from("creators")
    .insert({
      agency_id: profile.agency_id,
      full_name,
      handle: handle || null,
      niche: niche || null,
      followers: followers || null,
      monthly_revenue: monthly_revenue || 0,
      status: status || "active",
      platforms: platforms || [],
      color,
      initials,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ creator: data }, { status: 201 });
}
