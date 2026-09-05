import type { SupabaseClient } from "@supabase/supabase-js";

type ResolveArgs = {
  agencyId: string;
  dealId?: string | null;
  creatorId?: string | null;
  /** Falls kein zuständiger Manager ermittelbar ist (z. B. Scanner ohne User). */
  fallbackUserId?: string | null;
};

/**
 * Ermittelt den Empfänger einer Benachrichtigung:
 * Deal-Verantwortlicher → Manager des Creators → Fallback-User → irgendein
 * Agentur-Mitglied. Gibt null zurück, wenn die Agentur keine Profile hat.
 */
export async function resolveRecipient(
  supabase: SupabaseClient,
  { agencyId, dealId, creatorId, fallbackUserId }: ResolveArgs,
): Promise<string | null> {
  let creator = creatorId ?? null;

  if (dealId) {
    const { data } = await supabase
      .from("deals")
      .select("assignee_id, assigned_manager, creator_id")
      .eq("id", dealId)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (data?.assignee_id) return data.assignee_id as string;
    if (data?.assigned_manager) return data.assigned_manager as string;
    if (!creator && data?.creator_id) creator = data.creator_id as string;
  }

  if (creator) {
    const { data } = await supabase
      .from("creators")
      .select("manager_id")
      .eq("id", creator)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (data?.manager_id) return data.manager_id as string;
  }

  if (fallbackUserId) return fallbackUserId;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("agency_id", agencyId)
    .limit(1)
    .maybeSingle();
  return (profile?.id as string | undefined) ?? null;
}
