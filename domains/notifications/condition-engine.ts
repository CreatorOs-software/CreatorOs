import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/domains/auth";
import { NotificationRepository } from "./repository";
import type { ConditionSignal, Notification } from "./types";

type EvaluationContext = {
  agencyId: string;
  userId: string;
  role: Role;
};

type DealRow = {
  id: string;
  title: string;
  creator_id: string | null;
  assignee_id: string | null;
  assigned_manager: string | null;
  deliverables: unknown;
  payment_items: unknown;
  creators: { manager_id: string | null } | { manager_id: string | null }[] | null;
};

type AnfrageRow = {
  id: string;
  title: string | null;
  brand_name: string | null;
  status: string;
  updated_at: string;
  creator_id: string;
  linked_deal_id: string | null;
  creators: { manager_id: string | null } | { manager_id: string | null }[] | null;
  brands: { company_name: string } | { company_name: string }[] | null;
};

type IncomingRequestRow = {
  id: string;
  subject: string;
  sender_name: string | null;
  sender_email: string;
  received_at: string;
  suggested_creator_id: string | null;
  creator_matches: Array<{
    creator_id: string;
    creator: { manager_id: string | null } | { manager_id: string | null }[] | null;
  }> | null;
};

type PaymentItem = {
  id?: string;
  label?: string;
  amount?: number;
  invoice_date?: string;
  payment_term?: number;
  paid_at?: string;
};

type Deliverable = {
  id?: string;
  content_type?: string;
  platform?: string;
  draft_deadline?: string | null;
  status?: string | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isoReminder(date: Date) {
  const result = new Date(date);
  result.setUTCHours(8, 0, 0, 0);
  return result.toISOString();
}

function calendarDaysSince(date: Date, today: Date) {
  return Math.floor((today.getTime() - date.getTime()) / 86_400_000);
}

function businessDaysSince(value: string, today: Date) {
  const cursor = new Date(value);
  cursor.setUTCHours(0, 0, 0, 0);
  let days = 0;
  while (cursor < today) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function recipientMatches(
  ownerId: string | null,
  stage: number,
  { userId, role }: EvaluationContext,
) {
  return ownerId === userId || (role === "admin" && (ownerId === null || stage >= 3));
}

function ownerForDeal(deal: DealRow) {
  return deal.assignee_id ?? deal.assigned_manager ?? one(deal.creators)?.manager_id ?? null;
}

function nextWeekly(today: Date) {
  return isoReminder(addDays(today, 7));
}

function invoiceSignals(deals: DealRow[], context: EvaluationContext, today: Date) {
  const signals: ConditionSignal[] = [];

  for (const deal of deals) {
    const ownerId = ownerForDeal(deal);
    const items = Array.isArray(deal.payment_items)
      ? (deal.payment_items as PaymentItem[])
      : [];

    items.forEach((item, index) => {
      if (!item.invoice_date || item.paid_at) return;
      const issuedAt = parseDate(item.invoice_date);
      if (Number.isNaN(issuedAt.getTime())) return;
      const due = addDays(issuedAt, item.payment_term ?? 0);
      const daysOverdue = calendarDaysSince(due, today);
      const itemKey = item.id ?? `${deal.id}:${index}`;
      const label = item.label || "Rechnung";

      if (daysOverdue < 0 && daysOverdue >= -3) {
        const daysLeft = Math.abs(daysOverdue);
        const stage = daysLeft <= 1 ? 2 : 1;
        if (!recipientMatches(ownerId, stage, context)) return;
        signals.push({
          ruleKey: "INVOICE_DUE_SOON",
          entityKey: `deal-payment:${itemKey}`,
          stage,
          severity: "NORMAL",
          subjectType: "INVOICE",
          subjectId: deal.id,
          vorgangKey: `deal:${deal.id}`,
          creatorId: deal.creator_id,
          title: `${label} wird ${daysLeft === 1 ? "morgen" : `in ${daysLeft} Tagen`} fällig`,
          reason: `${deal.title} · fällig am ${formatDate(due)}`,
          href: `/creators/deals/edit/${deal.id}`,
          dueDate: due.toISOString().slice(0, 10),
          nextReminderAt: isoReminder(addDays(due, stage === 1 ? -1 : 1)),
        });
        return;
      }

      if (daysOverdue >= 1) {
        const stage = daysOverdue >= 7 ? 3 : daysOverdue >= 3 ? 2 : 1;
        if (!recipientMatches(ownerId, stage, context)) return;
        signals.push({
          ruleKey: "INVOICE_OVERDUE",
          entityKey: `deal-payment:${itemKey}`,
          stage,
          severity: "LAUT",
          subjectType: "INVOICE",
          subjectId: deal.id,
          vorgangKey: `deal:${deal.id}`,
          creatorId: deal.creator_id,
          title: `${label} ist seit ${daysOverdue} ${daysOverdue === 1 ? "Tag" : "Tagen"} überfällig`,
          reason: deal.title,
          href: `/creators/deals/edit/${deal.id}`,
          dueDate: due.toISOString().slice(0, 10),
          nextReminderAt:
            stage === 1
              ? isoReminder(addDays(due, 3))
              : stage === 2
                ? isoReminder(addDays(due, 7))
                : nextWeekly(today),
        });
      }
    });
  }

  return signals;
}

function draftSignals(deals: DealRow[], context: EvaluationContext, today: Date) {
  const signals: ConditionSignal[] = [];

  for (const deal of deals) {
    const ownerId = ownerForDeal(deal);
    const deliverables = Array.isArray(deal.deliverables)
      ? (deal.deliverables as Deliverable[])
      : [];

    deliverables.forEach((item, index) => {
      if (!item.draft_deadline || ["in_freigabe", "live"].includes(item.status ?? "")) return;
      const due = parseDate(item.draft_deadline);
      if (Number.isNaN(due.getTime())) return;
      const daysOverdue = calendarDaysSince(due, today);
      const itemKey = item.id ?? `${deal.id}:${index}`;
      const name = item.content_type || item.platform || "Draft";

      if (daysOverdue < 0 && daysOverdue >= -3) {
        const daysLeft = Math.abs(daysOverdue);
        const stage = daysLeft <= 1 ? 2 : 1;
        if (!recipientMatches(ownerId, stage, context)) return;
        signals.push({
          ruleKey: "DRAFT_DUE_SOON",
          entityKey: `deliverable:${itemKey}`,
          stage,
          severity: "NORMAL",
          subjectType: "DEAL",
          subjectId: deal.id,
          vorgangKey: `deal:${deal.id}`,
          creatorId: deal.creator_id,
          title: `${name}-Draft ist ${daysLeft === 1 ? "morgen" : `in ${daysLeft} Tagen`} fällig`,
          reason: deal.title,
          href: `/creators/deals/edit/${deal.id}`,
          dueDate: item.draft_deadline,
          nextReminderAt: isoReminder(addDays(due, stage === 1 ? -1 : 1)),
        });
        return;
      }

      if (daysOverdue >= 1) {
        const stage = daysOverdue >= 3 ? 3 : 1;
        if (!recipientMatches(ownerId, stage, context)) return;
        signals.push({
          ruleKey: "DRAFT_OVERDUE",
          entityKey: `deliverable:${itemKey}`,
          stage,
          severity: "LAUT",
          subjectType: "DEAL",
          subjectId: deal.id,
          vorgangKey: `deal:${deal.id}`,
          creatorId: deal.creator_id,
          title: `${name}-Draft ist seit ${daysOverdue} ${daysOverdue === 1 ? "Tag" : "Tagen"} überfällig`,
          reason: deal.title,
          href: `/creators/deals/edit/${deal.id}`,
          dueDate: item.draft_deadline,
          nextReminderAt: stage === 1 ? isoReminder(addDays(due, 3)) : nextWeekly(today),
        });
      }
    });
  }

  return signals;
}

function requestSignals(requests: AnfrageRow[], context: EvaluationContext, today: Date) {
  return requests.flatMap((request): ConditionSignal[] => {
    const age = businessDaysSince(request.updated_at, today);
    if (age < 2) return [];
    const stage = age >= 7 ? 3 : age >= 4 ? 2 : 1;
    const ownerId = one(request.creators)?.manager_id ?? null;
    if (!recipientMatches(ownerId, stage, context)) return [];
    const brand = one(request.brands)?.company_name ?? request.brand_name ?? "Brand";

    return [{
      ruleKey: "REQUEST_STALE",
      entityKey: `anfrage:${request.id}`,
      stage,
      severity: stage >= 2 ? "LAUT" : "NORMAL",
      subjectType: "ANFRAGE",
      subjectId: request.id,
      vorgangKey: request.linked_deal_id ? `deal:${request.linked_deal_id}` : `anfrage:${request.id}`,
      creatorId: request.creator_id,
      title: `Anfrage von ${brand} wartet seit ${age} Werktagen`,
      reason: request.title ?? "Noch nicht weiterbearbeitet",
      href: `/creators/anfragen/edit/${request.id}`,
      nextReminderAt: stage === 1
        ? isoReminder(addDays(today, 2))
        : stage === 2
          ? isoReminder(addDays(today, 3))
          : nextWeekly(today),
    }];
  });
}

function incomingRequestSignals(
  requests: IncomingRequestRow[],
  context: EvaluationContext,
  today: Date,
) {
  return requests.flatMap((request): ConditionSignal[] => {
    const receivedAt = new Date(request.received_at);
    if (Number.isNaN(receivedAt.getTime())) return [];
    const age = calendarDaysSince(receivedAt, today);
    if (age < 3) return [];
    const stage = age >= 7 ? 3 : age >= 5 ? 2 : 1;
    const creatorMatches = request.creator_matches ?? [];
    const belongsToUser = creatorMatches.some(
      (match) => one(match.creator)?.manager_id === context.userId,
    );
    if (context.role !== "admin" && !belongsToUser) return [];
    const sender = request.sender_name ?? request.sender_email;
    const creatorId = creatorMatches[0]?.creator_id ?? request.suggested_creator_id;

    return [{
      ruleKey: "INCOMING_REQUEST_STALE",
      entityKey: `email-thread:${request.id}`,
      stage,
      severity: stage >= 2 ? "LAUT" : "NORMAL",
      subjectType: "EMAIL_THREAD",
      subjectId: request.id,
      vorgangKey: `email-thread:${request.id}`,
      creatorId,
      title: `Anfrage von ${sender} wartet seit ${age} Tagen`,
      reason: request.subject,
      href: `/inbox?thread=${request.id}`,
      nextReminderAt: stage === 1
        ? isoReminder(addDays(today, 2))
        : stage === 2
          ? isoReminder(addDays(today, 2))
          : nextWeekly(today),
    }];
  });
}

async function payoutSignals(
  supabase: SupabaseClient,
  context: EvaluationContext,
  today: Date,
): Promise<ConditionSignal[]> {
  const { data } = await supabase
    .from("payments")
    .select("id, payment_status, created_at, invoice_id, invoices!inner(id, number, paid_at, creator_id, deal_id, deals(assignee_id, assigned_manager), creators(manager_id))")
    .eq("agency_id", context.agencyId)
    .eq("payment_status", "pending");

  return ((data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    invoices: {
      id: string;
      number: string;
      paid_at: string | null;
      creator_id: string | null;
      deal_id: string | null;
      deals: { assignee_id: string | null; assigned_manager: string | null } | null;
      creators: { manager_id: string | null } | null;
    };
  }>).flatMap((payment): ConditionSignal[] => {
    const invoice = payment.invoices;
    if (!invoice.paid_at) return [];
    const age = businessDaysSince(invoice.paid_at, today);
    if (age < 3) return [];
    const stage = age >= 14 ? 3 : age >= 7 ? 2 : 1;
    const ownerId = invoice.deals?.assignee_id
      ?? invoice.deals?.assigned_manager
      ?? invoice.creators?.manager_id
      ?? null;
    if (!recipientMatches(ownerId, stage, context)) return [];

    return [{
      ruleKey: "PAYOUT_PENDING",
      entityKey: `payment:${payment.id}`,
      stage,
      severity: stage >= 2 ? "LAUT" : "NORMAL",
      subjectType: "INVOICE",
      subjectId: invoice.id,
      vorgangKey: invoice.deal_id ? `deal:${invoice.deal_id}` : `invoice:${invoice.id}`,
      creatorId: invoice.creator_id,
      title: `Auszahlung zu ${invoice.number} ist seit ${age} Werktagen offen`,
      reason: "Kundenzahlung ist bereits eingegangen",
      href: invoice.deal_id ? `/creators/deals/edit/${invoice.deal_id}` : "/creators",
      nextReminderAt: stage === 1
        ? isoReminder(addDays(today, 4))
        : stage === 2
          ? isoReminder(addDays(today, 7))
          : nextWeekly(today),
    }];
  });
}

function shouldTrigger(existing: Notification | undefined, signal: ConditionSignal, now: Date) {
  if (!existing) return true;
  if (existing.stage < signal.stage) return true;
  if (existing.snoozed_until && new Date(existing.snoozed_until) > now) return false;
  return !!existing.next_reminder_at && new Date(existing.next_reminder_at) <= now;
}

export async function evaluateNotificationConditions(
  supabase: SupabaseClient,
  context: EvaluationContext,
) {
  const today = startOfToday();
  const [{ data: deals }, { data: requests }, { data: incomingRequests }, existing, payouts] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, creator_id, assignee_id, assigned_manager, deliverables, payment_items, creators(manager_id)")
      .eq("agency_id", context.agencyId),
    supabase
      .from("anfragen")
      .select("id, title, brand_name, status, updated_at, creator_id, linked_deal_id, creators(manager_id), brands(company_name)")
      .eq("agency_id", context.agencyId)
      .in("status", ["neu", "pruefung"]),
    supabase
      .from("email_threads")
      .select("id, subject, sender_name, sender_email, received_at, suggested_creator_id, creator_matches:email_thread_creator_matches(creator_id, creator:creator_id(manager_id))")
      .eq("agency_id", context.agencyId)
      .eq("request_status", "open")
      .contains("system_labels", ["ANFRAGE"]),
    NotificationRepository.findForUser(supabase, context.agencyId, context.userId),
    payoutSignals(supabase, context, today),
  ]);

  const signals = [
    ...invoiceSignals((deals ?? []) as unknown as DealRow[], context, today),
    ...draftSignals((deals ?? []) as unknown as DealRow[], context, today),
    ...requestSignals((requests ?? []) as unknown as AnfrageRow[], context, today),
    ...incomingRequestSignals((incomingRequests ?? []) as unknown as IncomingRequestRow[], context, today),
    ...payouts,
  ];
  const activeKeys = new Set(signals.map((signal) => `${signal.ruleKey}:${signal.entityKey}`));
  const existingByKey = new Map<string, Notification>();
  for (const item of existing) {
    if (!item.is_condition || !item.rule_key || !item.entity_key) continue;
    const key = `${item.rule_key}:${item.entity_key}`;
    // findForUser is sorted newest first. Keep that row when archived
    // predecessors of the same condition are also present.
    if (!existingByKey.has(key)) existingByKey.set(key, item);
  }
  const now = new Date();

  for (const signal of signals) {
    const key = `${signal.ruleKey}:${signal.entityKey}`;
    const current = existingByKey.get(key);
    if (!shouldTrigger(current, signal, now)) continue;

    const id = await NotificationRepository.emit(supabase, {
      agencyId: context.agencyId,
      recipientId: context.userId,
      type: signal.ruleKey,
      severity: signal.severity,
      subjectType: signal.subjectType,
      subjectId: signal.subjectId,
      vorgangKey: `condition:${key}:user:${context.userId}`,
      creatorId: signal.creatorId,
      title: signal.title,
      reason: signal.reason,
      href: signal.href,
      payload: { due_date: signal.dueDate, stage: signal.stage },
    });
    if (!id) continue;

    await NotificationRepository.updateCondition(
      supabase,
      id,
      context.agencyId,
      context.userId,
      {
        rule_key: signal.ruleKey,
        entity_key: signal.entityKey,
        stage: signal.stage,
        reminder_count: (current?.reminder_count ?? -1) + 1,
        last_triggered_at: now.toISOString(),
        next_reminder_at: signal.nextReminderAt,
        acknowledged_at: null,
        snoozed_until: null,
        resolved_at: null,
        is_condition: true,
        status: "OPEN",
        read_at: null,
      },
    );
  }

  await Promise.all(
    existing
      .filter(
        (item) =>
          item.is_condition &&
          item.rule_key &&
          item.entity_key &&
          item.status !== "RESOLVED" &&
          !activeKeys.has(`${item.rule_key}:${item.entity_key}`),
      )
      .map((item) =>
        NotificationRepository.updateCondition(
          supabase,
          item.id,
          context.agencyId,
          context.userId,
          { status: "RESOLVED", resolved_at: now.toISOString(), read_at: now.toISOString() },
        ),
      ),
  );
}
