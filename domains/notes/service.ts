import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { NoteRepository } from "./repository";
import type { Note, NoteCreateInput, NotePatch } from "./types";

export const NoteService = {
  async listNotes(): Promise<Note[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return NoteRepository.findAll(supabase, agencyId);
  },

  async createNote(input: NoteCreateInput): Promise<Note> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    return NoteRepository.create(supabase, agencyId, userId, input);
  },

  async updateNote(id: string, patch: NotePatch): Promise<Note> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return NoteRepository.update(supabase, id, agencyId, patch);
  },

  async deleteNote(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return NoteRepository.remove(supabase, id, agencyId);
  },
};
