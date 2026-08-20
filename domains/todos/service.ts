import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { TodoRepository } from "./repository";
import type { Todo, TodoCreateInput, TodoPatch } from "./types";

export const TodoService = {
  async listTodos(): Promise<Todo[]> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    TodoRepository.purgeCompleted(supabase, agencyId);
    return TodoRepository.findAll(supabase, agencyId);
  },

  async createTodo(input: TodoCreateInput): Promise<Todo> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    return TodoRepository.create(supabase, agencyId, userId, input);
  },

  async updateTodo(id: string, patch: TodoPatch): Promise<Todo> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return TodoRepository.update(supabase, id, agencyId, patch);
  },

  async deleteTodo(id: string): Promise<void> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return TodoRepository.remove(supabase, id, agencyId);
  },
};
