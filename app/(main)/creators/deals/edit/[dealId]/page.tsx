import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { CreatorRepository } from "@/domains/creators/repository";
import { EditDealWizard } from "./edit-deal-wizard";
import type { DealFull, Deliverable, PaymentItem } from "@/components/creators/dashboard/types";
import type { DealFormValues } from "@/app/(main)/creators/deals/create-deal/[id]/deal-form.schema";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;
  const { supabase, agencyId } = await getAuthContext();

  const [dealRes, brandsRes, creatorsRes, usersRes] = await Promise.all([
    supabase
      .from("deals")
      .select(
        `id, title, budget, status, priority, platform, deadline,
         brand_id, creator_id,
         campaign_type, deliverables, description, product, contact_person,
         usage_rights, exclusivity, payment_items, blocker, created_at,
         campaign_start, campaign_end,
         guidelines, tracking_assets,
         rights, exclusivity_info, embargo, whitelisting,
         contract_status, contract_date, contract_url,
         brands(company_name, short_code, contact_name, contact_email)`,
      )
      .eq("id", dealId)
      .eq("agency_id", agencyId)
      .single(),
    supabase
      .from("brands")
      .select("id, company_name, short_code")
      .eq("agency_id", agencyId),
    supabase
      .from("creators")
      .select("id, full_name, initials")
      .eq("agency_id", agencyId)
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("agency_id", agencyId)
      .order("display_name"),
  ]);

  if (dealRes.error || !dealRes.data) notFound();

  const deal = dealRes.data as unknown as DealFull;
  const creatorId = deal.creator_id ?? "";
  const creator = creatorId
    ? await CreatorRepository.findById(supabase, creatorId)
    : null;

  const deliverables = Array.isArray(deal.deliverables)
    ? (deal.deliverables as Deliverable[]).filter(
        (d) => d && typeof d === "object" && "count" in d,
      )
    : [];

  const paymentItems = Array.isArray(deal.payment_items)
    ? (deal.payment_items as PaymentItem[])
    : [{ label: "Zahlung", amount: 0, invoice_date: "", payment_term: 30 as const }];

  const initialValues: DealFormValues = {
    title: deal.title ?? "",
    brand_id: deal.brand_id ?? "",
    product: deal.product ?? "",
    platform: deal.platform ?? "",
    creator_id: creatorId,
    contact_person: deal.contact_person ?? "",
    campaign_start: deal.campaign_start ?? "",
    campaign_end: deal.campaign_end ?? "",
    assignee_id: (deal as Record<string, unknown>).assignee_id as string | undefined,
    deliverables,
    deadline: deal.deadline ?? "",
    usage_rights: deal.usage_rights ?? "",
    exclusivity: deal.exclusivity ?? "",
    notes: deal.description ?? "",
    guidelines: (deal.guidelines as DealFormValues["guidelines"]) ?? {},
    tracking_assets: (deal.tracking_assets as DealFormValues["tracking_assets"]) ?? {},
    rights: (deal.rights as DealFormValues["rights"]) ?? {},
    exclusivity_info: (deal.exclusivity_info as DealFormValues["exclusivity_info"]) ?? {},
    embargo: (deal.embargo as DealFormValues["embargo"]) ?? {},
    whitelisting: (deal.whitelisting as DealFormValues["whitelisting"]) ?? {},
    contract_status: deal.contract_status ?? "offen",
    contract_date: deal.contract_date ?? "",
    contract_url: deal.contract_url ?? "",
    fee: Number(deal.budget) ?? 0,
    payment_items: paymentItems,
  };

  return (
    <EditDealWizard
      dealId={dealId}
      creator={creator}
      brands={brandsRes.data ?? []}
      creators={creatorsRes.data ?? []}
      initialValues={initialValues}
      users={usersRes.data ?? []}
    />
  );
}
