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
  const creator = await CreatorRepository.findById(supabase, id);

  if (!creator || creator.agency_id !== agencyId) notFound();

  return <CreateDealWizard creator={creator} />;
}
