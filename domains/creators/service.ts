import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { CreatorRepository } from "./repository";
import type { Creator, CreatorInsert, CreatorPatch, CreatorsPageData } from "./types";

export const CreatorService = {
  async getPageData(): Promise<CreatorsPageData> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return CreatorRepository.findPageData(supabase, agencyId);
  },

  async getById(id: string): Promise<Creator | null> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return CreatorRepository.findById(supabase, id);
  },

  async getListData(): Promise<Creator[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return CreatorRepository.findListData(supabase, agencyId);
  },

  async create(input: Omit<CreatorInsert, "agency_id">): Promise<Creator> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return CreatorRepository.create(supabase, { ...input, agency_id: agencyId });
  },

  async patch(id: string, patch: CreatorPatch): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return CreatorRepository.patch(supabase, id, patch);
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return CreatorRepository.remove(supabase, id);
  },
};
