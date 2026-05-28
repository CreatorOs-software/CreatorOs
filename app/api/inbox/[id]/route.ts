import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const patch = await request.json();

  const allowed = ["unread", "starred", "priority"];
  const safe = Object.fromEntries(
    Object.entries(patch).filter(([k]) => allowed.includes(k)),
  );

  const { error } = await supabase
    .from("email_threads")
    .update(safe)
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
