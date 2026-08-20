import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { TodoService } from "@/domains/todos";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1),
  due_date: z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["niedrig", "mittel", "hoch"]).nullable().optional(),
});

export async function GET() {
  try {
    const todos = await TodoService.listTodos();
    return Response.json({ todos });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const todo = await TodoService.createTodo(parsed.data);
    return Response.json({ todo }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
