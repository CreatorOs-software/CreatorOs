import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { TodoService } from "@/domains/todos";
import { NotificationRepository } from "./repository";
import { evaluateNotificationConditions } from "./condition-engine";
import type {
  EmitInput,
  MuteInput,
  Notification,
  NotificationMute,
} from "./types";

export const NotificationService = {
  async list(): Promise<Notification[]> {
    const supabase = await createClient();
    const { agencyId, userId, role } = await getAuthContext(supabase);
    try {
      await evaluateNotificationConditions(supabase, { agencyId, userId, role });
    } catch (error) {
      console.error("[notifications] condition evaluation failed", error);
    }
    return NotificationRepository.findForUser(supabase, agencyId, userId);
  },

  /**
   * Erzeugt eine Benachrichtigung. Best-effort: wird nach einem bereits
   * erfolgreichen Vorgang (Status-Wechsel, Mail-Versand) aufgerufen und darf
   * den auslösenden Ablauf niemals abbrechen.
   */
  async emit(supabase: SupabaseClient, input: EmitInput): Promise<void> {
    try {
      await NotificationRepository.emit(supabase, input);
    } catch (e) {
      console.error("[notifications] emit failed", e);
    }
  },

  async dismiss(id: string): Promise<Notification> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    return NotificationRepository.setStatus(supabase, id, agencyId, userId, "DISMISSED");
  },

  async updateInteraction(
    id: string,
    action:
      | { type: "read"; unread: boolean }
      | { type: "acknowledge" }
      | { type: "snooze"; until: string }
      | { type: "restore" },
  ): Promise<Notification> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    const now = new Date().toISOString();
    const patch = action.type === "read"
      ? { read_at: action.unread ? null : now }
      : action.type === "acknowledge"
        ? { acknowledged_at: now, read_at: now }
        : action.type === "snooze"
          ? { snoozed_until: action.until, read_at: now }
          : { status: "OPEN" as const, acknowledged_at: null, snoozed_until: null };
    return NotificationRepository.updateInteraction(
      supabase,
      id,
      agencyId,
      userId,
      patch,
    );
  },

  async markAllRead(): Promise<void> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    await NotificationRepository.markAllRead(supabase, agencyId, userId);
  },

  async convertToTodo(id: string): Promise<{ notification: Notification; todoId: string }> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);

    const notification = await NotificationRepository.getById(supabase, id, agencyId, userId);
    if (!notification) throw new Error("Benachrichtigung nicht gefunden");

    const dueDate =
      typeof notification.payload?.due_date === "string"
        ? (notification.payload.due_date as string)
        : null;
    const priority =
      notification.severity === "LAUT"
        ? "hoch"
        : notification.severity === "NORMAL"
          ? "mittel"
          : "niedrig";

    const todo = await TodoService.createTodo({
      title: notification.title,
      due_date: dueDate,
      assignee_id: notification.creator_id,
      priority,
    });

    const updated = await NotificationRepository.attachTodo(
      supabase,
      id,
      agencyId,
      userId,
      todo.id,
    );
    return { notification: updated, todoId: todo.id };
  },

  async listMutes(): Promise<NotificationMute[]> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    return NotificationRepository.listMutes(supabase, agencyId, userId);
  },

  async mute(input: MuteInput): Promise<NotificationMute> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    return NotificationRepository.createMute(supabase, agencyId, userId, input);
  },

  async unmute(input: MuteInput): Promise<void> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);
    return NotificationRepository.deleteMute(supabase, agencyId, userId, input);
  },
};
