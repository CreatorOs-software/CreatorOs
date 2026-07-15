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

  const [dealRes, brandsRes, creatorsRes] = await Promise.all([
    supabase
      .from("deals")
      .select(
        `id, title, budget, status, priority, platform, deadline,
         brand_id, creator_id,
         campaign_type, deliverables, description, product, contact_person,
         usage_rights, exclusivity, payment_items, blocker, created_at,
         brands(company_name, color, short_code, contact_name, contact_email)`,
      )
      .eq("id", dealId)
      .eq("agency_id", agencyId)
      .single(),
    supabase
      .from("brands")
      .select("id, company_name, color, short_code")
      .eq("agency_id", agencyId),
    supabase
      .from("creators")
      .select("id, full_name, color, initials")
      .eq("agency_id", agencyId)
      .order("full_name"),
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
    deliverables,
    deadline: deal.deadline ?? "",
    usage_rights: deal.usage_rights ?? "",
    exclusivity: deal.exclusivity ?? "",
    notes: deal.description ?? "",
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
    />
  );
}
