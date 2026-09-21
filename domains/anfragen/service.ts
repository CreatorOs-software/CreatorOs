import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { emitNewRequestDetected } from "@/domains/notifications/events";
import { AnfrageRepository } from "./repository";
import type { Anfrage, AnfrageCreateInput, AnfragePatch } from "./types";

export class AnfrageError extends Error {}

export const AnfrageService = {
  async getAnfragenByCreator(creatorId: string): Promise<Anfrage[]> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return AnfrageRepository.findByCreator(supabase, creatorId);
  },

  async getAnfrage(id: string): Promise<Anfrage> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    const anfrage = await AnfrageRepository.findById(supabase, id, agencyId);
    if (!anfrage) throw new AnfrageError("Anfrage nicht gefunden");
    return anfrage;
  },

  async createAnfrage(
    creatorId: string,
    input: Omit<AnfrageCreateInput, "creator_id">,
  ): Promise<Anfrage> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    const request = await AnfrageRepository.create(supabase, agencyId, { ...input, creator_id: creatorId });
    try {
      await emitNewRequestDetected(supabase, agencyId, userId, request);
    } catch (error) {
      console.error("[anfragen] notification emit failed", error);
    }
    return request;
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
