import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { CreatorRepository } from "@/domains/creators/repository";
import { CreateDealWizard } from "./create-deal-wizard";

export default async function CreateDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, agencyId } = await getAuthContext();

  const [creator, brandsRes, creatorsRes] = await Promise.all([
    CreatorRepository.findById(supabase, id),
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

  if (!creator || creator.agency_id !== agencyId) notFound();

  return (
    <CreateDealWizard
      creator={creator}
      brands={brandsRes.data ?? []}
      creators={creatorsRes.data ?? []}
    />
  );
}
