import { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/auth-context";
import { NotificationService } from "@/domains/notifications";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await NotificationService.convertToTodo(id);
    return Response.json(result, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
