export type Thread = {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  preview: string | null;
  body: string | null;
  body_html: string | null;
  received_at: string;
  unread: boolean;
  starred: boolean;
  priority: "low" | "med" | "high";
  integration_id: string | null;
  folder: string | null;
};

export type Integration = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  creator_id: string | null;
};

export type Creator = {
  id: string;
  full_name: string;
  initials: string;
  color: string;
};

export type InboxData = {
  threads: Thread[];
  integrations: Integration[];
  creators: Creator[];
};

export type Filter = "all" | "unread" | "starred";
export type MailboxId = string | "__all__" | "__sent__" | "__starred__";

export const PRIORITY_LABEL: Record<string, string> = {
  high: "H",
  med: "M",
  low: "L",
};

export const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-orange-500/10 text-orange-600",
  med: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground",
};

export const PRIORITY_FULL: Record<string, string> = {
  high: "Hoch",
  med: "Mittel",
  low: "Niedrig",
};

export function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86_400_000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 86_400_000)
    return d.toLocaleDateString("de-DE", { weekday: "short" });
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

export function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mailboxInitials(email: string) {
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
