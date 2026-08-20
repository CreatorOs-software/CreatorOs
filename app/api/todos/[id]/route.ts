import { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth-context";
import { TodoService } from "@/domains/todos";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  done: z.boolean().optional(),
  due_date: z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["niedrig", "mittel", "hoch"]).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ungültige Daten" }, { status: 400 });
    }
    const todo = await TodoService.updateTodo(id, parsed.data);
    return Response.json({ todo });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await TodoService.deleteTodo(id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
