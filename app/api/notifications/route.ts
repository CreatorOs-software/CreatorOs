import { toErrorResponse } from "@/lib/auth-context";
import { NotificationService } from "@/domains/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = await NotificationService.list();
    const unreadCount = notifications.filter((n) => !n.read_at).length;
    return Response.json({ notifications, unreadCount });
  } catch (e) {
    return toErrorResponse(e);
  }
}
