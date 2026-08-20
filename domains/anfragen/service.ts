import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { AnfrageRepository } from "./repository";
import type { Anfrage, AnfrageCreateInput, AnfragePatch } from "./types";

export class AnfrageError extends Error {}

export const AnfrageService = {
  async getAnfragenByCreator(creatorId: string): Promise<Anfrage[]> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return AnfrageRepository.findByCreator(supabase, creatorId);
  },

  async createAnfrage(
    creatorId: string,
    input: Omit<AnfrageCreateInput, "creator_id">,
  ): Promise<Anfrage> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return AnfrageRepository.create(supabase, agencyId, { ...input, creator_id: creatorId });
  },

  async updateAnfrage(id: string, patch: AnfragePatch): Promise<{ id: string; status: string }> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return AnfrageRepository.update(supabase, id, agencyId, patch);
  },

  async deleteAnfrage(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return AnfrageRepository.remove(supabase, id, agencyId);
  },
};
