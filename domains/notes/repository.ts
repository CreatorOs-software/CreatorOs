import type { SupabaseClient } from "@supabase/supabase-js";
import type { Note, NoteCreateInput, NotePatch } from "./types";

const NOTE_SELECT = `id, title, content, creator_id, brand_id, created_at, updated_at`;

export const NoteRepository = {
  async findAll(supabase: SupabaseClient, agencyId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from("notes")
      .select(NOTE_SELECT)
      .eq("agency_id", agencyId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Note[];
  },

  async create(
    supabase: SupabaseClient,
    agencyId: string,
    userId: string,
    input: NoteCreateInput,
  ): Promise<Note> {
    const { data, error } = await supabase
      .from("notes")
      .insert({ ...input, agency_id: agencyId, created_by: userId })
      .select(NOTE_SELECT)
      .single();
    if (error) throw error;
    return data as Note;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: NotePatch,
  ): Promise<Note> {
    const { data, error } = await supabase
      .from("notes")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select(NOTE_SELECT)
      .single();
    if (error) throw error;
    return data as Note;
  },

  async remove(supabase: SupabaseClient, id: string, agencyId: string): Promise<void> {
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },
};
