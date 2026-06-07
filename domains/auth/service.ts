import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthContext } from "./types";

export class AuthError extends Error {
  constructor() { super("Unauthorized"); }
}

export class NoAgencyError extends Error {
  constructor() { super("No agency"); }
}

export async function getAuthContext(supabase: SupabaseClient): Promise<AuthContext> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthError();

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.agency_id) throw new NoAgencyError();

  return {
    userId: user.id,
    agencyId: profile.agency_id as string,
    displayName: (profile.display_name as string | null) ?? null,
  };
}

export function toErrorResponse(e: unknown): Response {
  if (e instanceof AuthError)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (e instanceof NoAgencyError)
    return Response.json({ error: "No agency" }, { status: 400 });
  console.error("[api]", e);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
