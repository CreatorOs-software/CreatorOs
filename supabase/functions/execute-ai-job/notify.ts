// Notification-Emit für eingehende Mails. Läuft im Label-Pfad von index.ts,
// unabhängig davon ob AUTO_LABEL aktiv ist. Best-effort — Fehler werden
// geloggt, brechen den Mail-Sync nie ab.
//
// Duplikat von domains/notifications/recipient.ts (Deno-Runtime kann keine
// Next.js-Module importieren) — bei Änderungen an der Empfänger-Logik dort
// mitziehen.
import type { createClient } from "npm:@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

type InboundThread = {
  id: string;
  subject: string;
  folder: string | null;
  sender_email: string | null;
  sender_name: string | null;
};

async function resolveRecipient(
  db: SupabaseClient,
  args: { agencyId: string; dealId?: string | null; creatorId?: string | null },
): Promise<string | null> {
  const { agencyId, dealId } = args;
  let creator = args.creatorId ?? null;

  if (dealId) {
    const { data } = await db
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
    const { data } = await db
      .from("creators")
      .select("manager_id")
      .eq("id", creator)
      .eq("agency_id", agencyId)
      .maybeSingle();
    if (data?.manager_id) return data.manager_id as string;
  }

  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .eq("agency_id", agencyId)
    .limit(1)
    .maybeSingle();
  return (profile?.id as string | undefined) ?? null;
}

async function emitNotification(
  db: SupabaseClient,
  input: {
    agencyId: string;
    recipientId: string;
    type: string;
    severity: "LAUT" | "NORMAL" | "LEISE";
    subjectType: string;
    subjectId: string;
    vorgangKey: string;
    creatorId: string | null;
    title: string;
    reason?: string | null;
    href?: string | null;
  },
): Promise<void> {
  const { error } = await db.rpc("emit_notification", {
    p_agency_id: input.agencyId,
    p_recipient_id: input.recipientId,
    p_type: input.type,
    p_severity: input.severity,
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_vorgang_key: input.vorgangKey,
    p_creator_id: input.creatorId,
    p_title: input.title,
    p_reason: input.reason ?? null,
    p_href: input.href ?? null,
    p_payload: {},
    p_bundle_key: null,
  });
  if (error) console.error("[notifications] emit_notification failed:", error.message);
}

/**
 * Antwort auf eine Conversation mit verknüpfter Anfrage → BRAND_REPLIED,
 * Vorgang = Anfrage (bzw. Deal, falls schon gewonnen).
 */
async function emitBrandReplied(
  db: SupabaseClient,
  agencyId: string,
  anfrageId: string,
): Promise<void> {
  const { data: anfrage } = await db
    .from("anfragen")
    .select("id, creator_id, brand_name, linked_deal_id, brands(company_name)")
    .eq("id", anfrageId)
    .eq("agency_id", agencyId)
    .maybeSingle<{
      id: string;
      creator_id: string;
      brand_name: string | null;
      linked_deal_id: string | null;
      brands: { company_name: string } | null;
    }>();
  if (!anfrage) return;

  const recipientId = await resolveRecipient(db, {
    agencyId,
    creatorId: anfrage.creator_id,
    dealId: anfrage.linked_deal_id,
  });
  if (!recipientId) return;

  const brandName = anfrage.brands?.company_name ?? anfrage.brand_name ?? "Brand";

  await emitNotification(db, {
    agencyId,
    recipientId,
    type: "BRAND_REPLIED",
    severity: "NORMAL",
    subjectType: "ANFRAGE",
    subjectId: anfrage.id,
    vorgangKey: anfrage.linked_deal_id ? `deal:${anfrage.linked_deal_id}` : `anfrage:${anfrage.id}`,
    creatorId: anfrage.creator_id,
    title: `${brandName} hat geantwortet`,
    href: `/creators/anfragen/edit/${anfrage.id}`,
  });
}

/**
 * Mail von einer bereits angelegten Brand, aber (noch) ohne verknüpfte
 * Anfrage — deterministischer Abgleich über Kontakt-E-Mail / Domain, wie
 * beim manuellen "Analysieren" im WorkPanel (app/api/inbox/[id]/analyse).
 */
async function emitKnownBrandEmail(
  db: SupabaseClient,
  agencyId: string,
  thread: InboundThread,
  conversationId: string,
): Promise<void> {
  const senderEmail = (thread.sender_email ?? "").toLowerCase().trim();
  if (!senderEmail) return;
  const senderDomain = senderEmail.split("@")[1] ?? "";

  const { data: brands } = await db
    .from("brands")
    .select("id, company_name, contact_email, brand_contacts(email)")
    .eq("agency_id", agencyId);
  if (!brands?.length) return;

  const match = (brands as Array<{
    id: string;
    company_name: string;
    contact_email: string | null;
    brand_contacts: { email: string | null }[] | null;
  }>).find((b) => {
    const emails = [
      b.contact_email,
      ...(b.brand_contacts ?? []).map((c) => c.email),
    ]
      .filter((e): e is string => !!e)
      .map((e) => e.toLowerCase());
    if (emails.includes(senderEmail)) return true;
    if (!senderDomain) return false;
    return emails.some((e) => e.split("@")[1] === senderDomain);
  });
  if (!match) return;

  const recipientId = await resolveRecipient(db, { agencyId });
  if (!recipientId) return;

  await emitNotification(db, {
    agencyId,
    recipientId,
    type: "BRAND_REPLIED",
    severity: "NORMAL",
    subjectType: "EMAIL_THREAD",
    subjectId: thread.id,
    vorgangKey: `thread:${conversationId}`,
    creatorId: null,
    title: `Neue Mail von ${match.company_name}`,
    href: `/inbox?thread=${thread.id}`,
  });
}

/**
 * Einstiegspunkt: nur für eingehende (nicht selbst versendete) Mail.
 * Bevorzugt den Anfrage-Link; ohne Link greift der Brand-Abgleich.
 */
export async function maybeEmitInboundNotification(
  db: SupabaseClient,
  args: {
    thread: InboundThread;
    agencyId: string;
    conversationId: string;
    anfrageId: string | null;
  },
): Promise<void> {
  const { thread, agencyId, conversationId, anfrageId } = args;
  if ((thread.folder ?? "INBOX").toUpperCase() !== "INBOX") return;

  try {
    if (anfrageId) {
      await emitBrandReplied(db, agencyId, anfrageId);
      return;
    }
    await emitKnownBrandEmail(db, agencyId, thread, conversationId);
  } catch (e) {
    console.error("[notifications] inbound emit failed:", e instanceof Error ? e.message : e);
  }
}
