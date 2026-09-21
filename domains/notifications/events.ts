import type { SupabaseClient } from "@supabase/supabase-js";
import type { Anfrage } from "@/domains/anfragen/types";
import type { DealFull, DealPatch, Deliverable, PaymentItem } from "@/domains/deals/types";
import { fmtMoney } from "@/lib/formatters";
import { NotificationService } from "./service";
import { resolveRecipient } from "./recipient";
import type { NotificationSeverity, NotificationType } from "./types";

type EventDefinition = {
  key: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  reason?: string;
};

export async function emitNewRequestDetected(
  supabase: SupabaseClient,
  agencyId: string,
  fallbackUserId: string,
  request: Anfrage,
) {
  if (request.source === "manual") return;
  const recipientId = await resolveRecipient(supabase, {
    agencyId,
    creatorId: request.creator_id,
    fallbackUserId,
  });
  if (!recipientId) return;
  const brand = request.brands?.company_name ?? request.brand_name ?? "Unbekannte Brand";

  await NotificationService.emit(supabase, {
    agencyId,
    recipientId,
    type: "NEW_REQUEST_DETECTED",
    severity: "NORMAL",
    subjectType: "ANFRAGE",
    subjectId: request.id,
    vorgangKey: `event:new-request:${request.id}`,
    creatorId: request.creator_id,
    title: `Neue Anfrage von ${brand}`,
    reason: request.title ?? request.format ?? undefined,
    href: `/creators/anfragen/edit/${request.id}`,
  });
}

function byIdentity<T extends { id?: string }>(items: T[]) {
  return new Map(items.map((item, index) => [item.id ?? String(index), item]));
}

export async function emitDealEvents(
  supabase: SupabaseClient,
  context: { agencyId: string; actingUserId: string },
  before: DealFull,
  patch: DealPatch,
) {
  const events: EventDefinition[] = [];

  if (patch.payment_items) {
    const previous = byIdentity((before.payment_items ?? []) as PaymentItem[]);
    patch.payment_items.forEach((item, index) => {
      const old = previous.get(item.id ?? String(index));
      if (!old?.paid_at && item.paid_at) {
        events.push({
          key: `payment:${item.id ?? index}:${item.paid_at}`,
          type: "PAYMENT_RECEIVED",
          severity: "NORMAL",
          title: `Zahlung über ${fmtMoney(item.amount)} eingegangen`,
          reason: item.label || before.title,
        });
      }
    });
  }

  if (patch.deliverables) {
    const previous = byIdentity((before.deliverables ?? []) as Deliverable[]);
    patch.deliverables.forEach((item, index) => {
      const old = previous.get(item.id ?? String(index));
      const name = item.content_type || item.platform || "Content";
      if (old?.status !== "in_freigabe" && item.status === "in_freigabe") {
        events.push({
          key: `deliverable:${item.id ?? index}:in_freigabe`,
          type: "CONTENT_DELIVERED",
          severity: "NORMAL",
          title: `${name} wurde zur Freigabe eingereicht`,
          reason: before.title,
        });
      } else if (old?.status === "in_freigabe" && item.status === "live") {
        events.push({
          key: `deliverable:${item.id ?? index}:live`,
          type: "APPROVAL_GRANTED",
          severity: "NORMAL",
          title: `${name} wurde freigegeben`,
          reason: before.title,
        });
      } else if (old?.status !== "abgelehnt" && item.status === "abgelehnt") {
        events.push({
          key: `deliverable:${item.id ?? index}:abgelehnt`,
          type: "APPROVAL_REJECTED",
          severity: "LAUT",
          title: `${name} benötigt eine Korrektur`,
          reason: before.title,
        });
      }
    });
  }

  if (events.length === 0) return;
  const recipientId = await resolveRecipient(supabase, {
    agencyId: context.agencyId,
    dealId: before.id,
    creatorId: before.creator_id,
    fallbackUserId: context.actingUserId,
  });
  if (!recipientId) return;

  await Promise.all(
    events.map((event) =>
      NotificationService.emit(supabase, {
        agencyId: context.agencyId,
        recipientId,
        type: event.type,
        severity: event.severity,
        subjectType: event.type === "PAYMENT_RECEIVED" ? "INVOICE" : "DEAL",
        subjectId: before.id,
        vorgangKey: `event:${event.type}:${before.id}:${event.key}`,
        creatorId: before.creator_id,
        title: event.title,
        reason: event.reason,
        href: `/creators/deals/edit/${before.id}`,
      }),
    ),
  );
}
