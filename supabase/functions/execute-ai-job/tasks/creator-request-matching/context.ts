import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { EmailAnalysisOutput } from "../incoming-email-analysis/prompt.ts";

type Goal = {
  value: number;
  type: "umsatz" | "kooperationen" | "post";
  period: "30_tage" | "3_monate" | "1_jahr";
};

export type GoalProgress = Goal & {
  current: number;
  request_contribution: number | null;
  progress_percent: number;
  projected_percent: number | null;
};

export type DeterministicRule = {
  id: string;
  status: "pass" | "warning" | "fail" | "unknown";
  label: string;
  explanation: string;
};

export type CreatorRequestMatchingContext = {
  creator: {
    id: string;
    full_name: string;
    niche: string[];
    goals: Goal[];
    weitere_ziele: string | null;
    min_kooperation_betrag: number | null;
    wunsche_anforderungen: string | null;
  };
  request: EmailAnalysisOutput;
  email: {
    subject: string;
    sender_email: string;
    sender_name: string | null;
  };
  goal_progress: GoalProgress[];
  deterministic_rules: DeterministicRule[];
};

const PERIOD_DAYS = { "30_tage": 30, "3_monate": 90, "1_jahr": 365 } as const;
const COUNTED_DEAL_STATUSES = new Set(["confirmed", "production", "approval", "scheduled", "posted", "invoiced", "paid"]);

function startDate(period: Goal["period"]): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - PERIOD_DAYS[period]);
  return date.toISOString().slice(0, 10);
}

function requestBudget(request: EmailAnalysisOutput): number | null {
  if (request.fee != null) return request.fee;
  if (request.budget_offer != null) return request.budget_offer;
  if (request.budget != null) return request.budget;
  const paymentTotal = request.payment_items.reduce((sum, item) => sum + item.amount, 0);
  return paymentTotal > 0 ? paymentTotal : null;
}

function requestPosts(request: EmailAnalysisOutput): number | null {
  if (request.deliverables.length === 0) return null;
  return request.deliverables.reduce((sum, item) => sum + item.count, 0);
}

export async function buildCreatorRequestMatchingContext(
  payload: {
    creator_id: string;
    request: EmailAnalysisOutput;
    email: CreatorRequestMatchingContext["email"];
  },
  agencyId: string,
  db: SupabaseClient,
): Promise<CreatorRequestMatchingContext> {
  const { data: creator, error: creatorError } = await db
    .from("creators")
    .select("id, full_name, niche, goals, weitere_ziele, min_kooperation_betrag, wunsche_anforderungen")
    .eq("id", payload.creator_id)
    .eq("agency_id", agencyId)
    .single();

  if (creatorError || !creator) throw new Error("matching context: creator not found");

  const goals = (Array.isArray(creator.goals) ? creator.goals : []) as Goal[];
  const earliestStart = goals.length
    ? goals.map((goal) => startDate(goal.period)).sort()[0]
    : startDate("1_jahr");

  const [invoicesRes, dealsRes] = await Promise.all([
    db
      .from("invoices")
      .select("amount, paid_at, status")
      .eq("agency_id", agencyId)
      .eq("creator_id", payload.creator_id)
      .eq("status", "paid")
      .gte("paid_at", earliestStart),
    db
      .from("deals")
      .select("status, created_at, campaign_start, deliverables")
      .eq("agency_id", agencyId)
      .eq("creator_id", payload.creator_id)
      .gte("created_at", `${earliestStart}T00:00:00.000Z`),
  ]);

  if (invoicesRes.error) throw new Error(`matching context invoices: ${invoicesRes.error.message}`);
  if (dealsRes.error) throw new Error(`matching context deals: ${dealsRes.error.message}`);

  const invoices = invoicesRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const budget = requestBudget(payload.request);
  const posts = requestPosts(payload.request);

  const goalProgress = goals.map((goal): GoalProgress => {
    const from = startDate(goal.period);
    const target = goal.value > 0 ? goal.value : 1;
    let current = 0;
    let contribution: number | null = null;

    if (goal.type === "umsatz") {
      current = invoices
        .filter((invoice) => invoice.paid_at && invoice.paid_at >= from)
        .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
      contribution = budget;
    } else if (goal.type === "kooperationen") {
      current = deals.filter((deal) => {
        const date = deal.campaign_start ?? String(deal.created_at).slice(0, 10);
        return date >= from && COUNTED_DEAL_STATUSES.has(deal.status);
      }).length;
      contribution = payload.request.is_request ? 1 : null;
    } else {
      current = deals
        .filter((deal) => COUNTED_DEAL_STATUSES.has(deal.status))
        .flatMap((deal) => Array.isArray(deal.deliverables) ? deal.deliverables : [])
        .filter((item: { live_date?: string | null }) => item.live_date && item.live_date >= from)
        .reduce((sum: number, item: { count?: number }) => sum + Number(item.count ?? 1), 0);
      contribution = posts;
    }

    return {
      ...goal,
      current,
      request_contribution: contribution,
      progress_percent: Math.min(100, Math.round((current / target) * 100)),
      projected_percent: contribution == null
        ? null
        : Math.min(100, Math.round(((current + contribution) / target) * 100)),
    };
  });

  const rules: DeterministicRule[] = [
    budget == null
      ? { id: "budget_minimum", status: "unknown", label: "Mindestbetrag", explanation: "Kein Budget in der Anfrage erkannt." }
      : creator.min_kooperation_betrag && budget < creator.min_kooperation_betrag
        ? { id: "budget_minimum", status: "fail", label: "Mindestbetrag", explanation: `${budget} EUR liegen unter dem Mindestbetrag von ${creator.min_kooperation_betrag} EUR.` }
        : { id: "budget_minimum", status: "pass", label: "Mindestbetrag", explanation: "Das erkannte Budget erfüllt den hinterlegten Mindestbetrag." },
    payload.request.deliverables.length > 0
      ? { id: "deliverables", status: "pass", label: "Deliverables", explanation: `${payload.request.deliverables.length} Deliverable-Typen erkannt.` }
      : { id: "deliverables", status: "unknown", label: "Deliverables", explanation: "Keine konkreten Deliverables erkannt." },
    payload.request.campaign_start || payload.request.campaign_end || payload.request.period
      ? { id: "timing", status: "pass", label: "Zeitraum", explanation: "Ein Kampagnenzeitraum wurde erkannt." }
      : { id: "timing", status: "unknown", label: "Zeitraum", explanation: "Kein Kampagnenzeitraum erkannt." },
  ];

  return {
    creator: {
      id: creator.id,
      full_name: creator.full_name,
      niche: Array.isArray(creator.niche) ? creator.niche : [],
      goals,
      weitere_ziele: creator.weitere_ziele ?? null,
      min_kooperation_betrag: creator.min_kooperation_betrag == null ? null : Number(creator.min_kooperation_betrag),
      wunsche_anforderungen: creator.wunsche_anforderungen ?? null,
    },
    request: payload.request,
    email: payload.email,
    goal_progress: goalProgress,
    deterministic_rules: rules,
  };
}
