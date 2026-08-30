import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { CreatorRepository } from "@/domains/creators/repository";
import type { Anfrage } from "@/domains/anfragen";
import type {
  AnfrageFormValues,
  AnfrageExtras,
} from "@/app/(main)/creators/anfragen/create-anfrage/[id]/anfrage-form.schema";
import { getInitialValues } from "@/app/(main)/creators/anfragen/create-anfrage/[id]/anfrage-form.constants";
import { EditAnfrageWizard } from "./edit-anfrage-wizard";

const ANFRAGE_SELECT = `
  id, creator_id, brand_id, brand_name, contact_person,
  title, product, campaign_start, campaign_end,
  deliverables, payment_items, fee, guidelines, tracking_assets,
  format, budget_requested, budget_offer, source, status, notes
`;

export default async function EditAnfragePage({
  params,
}: {
  params: Promise<{ anfrageId: string }>;
}) {
  const { anfrageId } = await params;
  const { supabase, agencyId } = await getAuthContext();

  const [anfrageRes, brandsRes] = await Promise.all([
    supabase
      .from("anfragen")
      .select(ANFRAGE_SELECT)
      .eq("id", anfrageId)
      .eq("agency_id", agencyId)
      .single(),
    supabase
      .from("brands")
      .select("id, company_name, short_code")
      .eq("agency_id", agencyId),
  ]);

  if (anfrageRes.error || !anfrageRes.data) notFound();

  const anfrage = anfrageRes.data as unknown as Anfrage;
  const creator = anfrage.creator_id
    ? await CreatorRepository.findById(supabase, anfrage.creator_id)
    : null;

  const defaults = getInitialValues(anfrage.creator_id ?? "");

  const deliverables = Array.isArray(anfrage.deliverables)
    ? anfrage.deliverables.filter((d) => d && typeof d === "object" && "count" in d)
    : [];

  const paymentItems =
    Array.isArray(anfrage.payment_items) && anfrage.payment_items.length > 0
      ? anfrage.payment_items
      : defaults.payment_items;

  const initialValues: AnfrageFormValues = {
    ...defaults,
    title: anfrage.title ?? "",
    brand_id: anfrage.brand_id ?? "",
    product: anfrage.product ?? "",
    creator_id: anfrage.creator_id ?? "",
    contact_person: anfrage.contact_person ?? "",
    campaign_start: anfrage.campaign_start ?? "",
    campaign_end: anfrage.campaign_end ?? "",
    notes: anfrage.notes ?? "",
    guidelines: (anfrage.guidelines as AnfrageFormValues["guidelines"]) ?? {},
    tracking_assets:
      (anfrage.tracking_assets as AnfrageFormValues["tracking_assets"]) ?? {},
    deliverables: deliverables as AnfrageFormValues["deliverables"],
    fee: anfrage.fee != null ? Number(anfrage.fee) : 0,
    payment_items: paymentItems as AnfrageFormValues["payment_items"],
  };

  const initialExtras: AnfrageExtras = {
    source: anfrage.source ?? "manual",
    brand_name: anfrage.brand_name ?? "",
    budget_requested:
      anfrage.budget_requested != null ? String(anfrage.budget_requested) : "",
    budget_offer: anfrage.budget_offer != null ? String(anfrage.budget_offer) : "",
  };

  return (
    <EditAnfrageWizard
      anfrageId={anfrageId}
      creator={creator}
      brands={brandsRes.data ?? []}
      initialValues={initialValues}
      initialExtras={initialExtras}
    />
  );
}
