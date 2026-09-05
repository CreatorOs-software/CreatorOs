import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/formatters";
import { NotificationService } from "@/domains/notifications";
import { resolveRecipient } from "@/domains/notifications/recipient";
import type {
  NotificationSeverity,
  NotificationType,
} from "@/domains/notifications";
import { AnfrageRepository } from "./repository";
import type { Anfrage, AnfrageCreateInput, AnfragePatch } from "./types";

export class AnfrageError extends Error {}

export const AnfrageService = {
  async getAnfragenByCreator(creatorId: string): Promise<Anfrage[]> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return AnfrageRepository.findByCreator(supabase, creatorId);
  },

  async getAnfrage(id: string): Promise<Anfrage> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    const anfrage = await AnfrageRepository.findById(supabase, id, agencyId);
    if (!anfrage) throw new AnfrageError("Anfrage nicht gefunden");
    return anfrage;
  },

  async createAnfrage(
    creatorId: string,
    input: Omit<AnfrageCreateInput, "creator_id">,
  ): Promise<Anfrage> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return AnfrageRepository.create(supabase, agencyId, { ...input, creator_id: creatorId });
  },

  async updateAnfrage(id: string, patch: AnfragePatch): Promise<{ id: string; status: string }> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    const before = await AnfrageRepository.findById(supabase, id, agencyId);
    const result = await AnfrageRepository.update(supabase, id, agencyId, patch);
    if (before) {
      try {
        await emitAnfrageStatusEvent(supabase, { agencyId, actingUserId: userId, before, patch });
      } catch (e) {
        console.error("[anfragen] notification emit failed", e);
      }
    }
    return result;
  },

  async deleteAnfrage(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return AnfrageRepository.remove(supabase, id, agencyId);
  },
};

type StatusEventArgs = {
  agencyId: string;
  actingUserId: string;
  before: Anfrage;
  patch: AnfragePatch;
};

async function emitAnfrageStatusEvent(
  supabase: SupabaseClient,
  { agencyId, actingUserId, before, patch }: StatusEventArgs,
): Promise<void> {
  const next = patch.status;
  const brand = before.brands?.company_name ?? before.brand_name ?? "Brand";
  const offerChanged =
    patch.budget_offer != null && patch.budget_offer !== before.budget_offer;

  let event:
    | { type: NotificationType; severity: NotificationSeverity; title: string; reason?: string | null }
    | null = null;

  if (next && next !== before.status && (next === "zugesagt" || next === "gewonnen")) {
    event = { type: "OFFER_ACCEPTED", severity: "NORMAL", title: `${brand} sagt zu` };
  } else if (next === "abgelehnt" && before.status !== "abgelehnt") {
    event = {
      type: "OFFER_REJECTED",
      severity: "NORMAL",
      title: `${brand} sagt ab`,
      reason: patch.rejection_reason ?? before.rejection_reason ?? null,
    };
  } else if (offerChanged || (next === "verhandlung" && before.status !== "verhandlung")) {
    const offer = patch.budget_offer ?? before.budget_offer;
    const requested = before.budget_requested;
    event = {
      type: "OFFER_COUNTERED",
      severity: "NORMAL",
      title:
        offer != null
          ? `${brand} kontert mit ${fmtMoney(offer)}` +
            (requested != null ? ` (Anfrage lag bei ${fmtMoney(requested)})` : "")
          : `${brand} hat das Angebot kommentiert`,
    };
  }

  if (!event) return;

  const recipientId = await resolveRecipient(supabase, {
    agencyId,
    creatorId: before.creator_id,
    dealId: before.linked_deal_id,
    fallbackUserId: actingUserId,
  });
  if (!recipientId) return;

  await NotificationService.emit(supabase, {
    agencyId,
    recipientId,
    type: event.type,
    severity: event.severity,
    subjectType: "ANFRAGE",
    subjectId: before.id,
    vorgangKey: before.linked_deal_id
      ? `deal:${before.linked_deal_id}`
      : `anfrage:${before.id}`,
    creatorId: before.creator_id,
    title: event.title,
    reason: event.reason ?? null,
    href: `/creators/anfragen/edit/${before.id}`,
  });
}
