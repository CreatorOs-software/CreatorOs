import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthContext, Role } from "./types";
import { normalizePermissions } from "./permissions";

export class AuthError extends Error {
  constructor() { super("Unauthorized"); }
}

export class NoAgencyError extends Error {
  constructor() { super("No agency"); }
}

type ProfileRow = {
  agency_id: string | null;
  display_name: string | null;
  role: string | null;
  permissions: Record<string, unknown> | null;
};

export async function getAuthContext(supabase: SupabaseClient): Promise<AuthContext> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthError();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as ProfileRow | null;
  if (!profile || !profile.agency_id) throw new NoAgencyError();

  const role: Role = profile.role === "admin" ? "admin" : "member";
  const permissions = normalizePermissions(profile.permissions ?? {});

  return {
    userId: user.id,
    agencyId: profile.agency_id as string,
    displayName: (profile.display_name as string | null) ?? null,
    role,
    permissions,
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
