import type { SupabaseClient } from "@supabase/supabase-js";
import type { Todo, TodoCreateInput, TodoPatch } from "./types";

const TODO_SELECT = `
  id, title, done, due_date, priority, created_at,
  assignee:assignee_id (id, full_name, initials)
`;

const PURGE_CUTOFF_MS = 3 * 24 * 60 * 60 * 1000;

export const TodoRepository = {
  purgeCompleted(supabase: SupabaseClient, agencyId: string): void {
    const cutoff = new Date(Date.now() - PURGE_CUTOFF_MS).toISOString();
    supabase
      .from("todos")
      .delete()
      .eq("agency_id", agencyId)
      .eq("done", true)
      .lt("updated_at", cutoff)
      .then(() => {});
  },

  async findAll(supabase: SupabaseClient, agencyId: string): Promise<Todo[]> {
    const { data, error } = await supabase
      .from("todos")
      .select(TODO_SELECT)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Todo[];
  },

  async create(
    supabase: SupabaseClient,
    agencyId: string,
    userId: string,
    input: TodoCreateInput,
  ): Promise<Todo> {
    const { data, error } = await supabase
      .from("todos")
      .insert({ ...input, agency_id: agencyId, created_by: userId })
      .select(TODO_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as Todo;
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    agencyId: string,
    patch: TodoPatch,
  ): Promise<Todo> {
    const { data, error } = await supabase
      .from("todos")
      .update(patch)
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select(TODO_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as Todo;
  },

  async remove(supabase: SupabaseClient, id: string, agencyId: string): Promise<void> {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    if (error) throw error;
  },
};
