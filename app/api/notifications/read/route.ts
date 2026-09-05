import { toErrorResponse } from "@/lib/auth-context";
import { NotificationService } from "@/domains/notifications";

export async function POST() {
  try {
    await NotificationService.markAllRead();
    return new Response(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
