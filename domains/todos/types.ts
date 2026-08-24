export type TodoPriority = "niedrig" | "mittel" | "hoch";

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  priority: TodoPriority | null;
  created_at: string;
  assignee: { id: string; full_name: string; initials: string; color: string } | null;
};

export type TodoCreateInput = {
  title: string;
  due_date?: string | null;
  assignee_id?: string | null;
  priority?: TodoPriority | null;
};

export type TodoPatch = {
  title?: string;
  done?: boolean;
  due_date?: string | null;
  assignee_id?: string | null;
  priority?: TodoPriority | null;
};
