import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { CreatorRepository } from "@/domains/creators/repository";
import { CreateAnfrageWizard } from "./create-anfrage-wizard";

export default async function CreateAnfragePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, agencyId } = await getAuthContext();

  const [creator, brandsRes] = await Promise.all([
    CreatorRepository.findById(supabase, id),
    supabase
      .from("brands")
      .select("id, company_name, short_code")
      .eq("agency_id", agencyId),
  ]);

  if (!creator || creator.agency_id !== agencyId) notFound();

  return <CreateAnfrageWizard creator={creator} brands={brandsRes.data ?? []} />;
}
