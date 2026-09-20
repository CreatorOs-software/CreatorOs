export type EmailLabel = {
  id: string;
  name: string;
  color: string;
};

export type SystemLabel = "ANFRAGE" | "LAUFEND" | "PROMOTIONS" | "RECHNUNG" | "ANDERES";

export type LabelStatus =
  | "pending"
  | "processing"
  | "completed"
  | "skipped"
  | "failed"
  | "manual"
  | "low_confidence";

export type EmailThread = {
  id: string;
  agency_id: string;
  integration_id: string;
  folder: string;
  sender_email: string;
  sender_name: string | null;
  recipient_email: string | null;
  labels: EmailLabel[];
  subject: string;
  preview: string | null;
  // Listenabfragen laden `body`/`body_html` nicht mehr — erst die Detailabfrage
  // (`getThreadBody`) füllt sie. In Listen-Objekten sind sie daher `undefined`.
  body?: string | null;
  body_html?: string | null;
  received_at: string;
  unread: boolean;
  starred: boolean;
  priority: "low" | "med" | "high";
  gmail_thread_id: string | null;
  system_labels: SystemLabel[];
  label_status: LabelStatus;
  conversation_id: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  anfrage_id: string | null;
  deal_id: string | null;
};

/** Vollständiger Nachrichtentext — nur beim Öffnen einer einzelnen E-Mail geladen. */
export type EmailThreadBody = {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  body: string | null;
  body_html: string | null;
  received_at: string;
};

/** Eine Vorgänger-Nachricht im Thread-Verlauf der Detailansicht. */
export type ConversationMessage = {
  id: string;
  sender_email: string;
  sender_name: string | null;
  received_at: string;
  preview: string | null;
  body: string | null;
  body_html: string | null;
};

export type ThreadPatch = {
  unread?: boolean;
  starred?: boolean;
  priority?: "low" | "med" | "high";
  folder?: string;
};

export type InboxCreator = {
  id: string;
  full_name: string;
  initials: string;
  phone: string | null;
};

export type InboxIntegration = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  status: string;
  creator_id: string | null;
  auto_label: boolean;
};

export type InboxPageData = {
  threads: EmailThread[];
  integrations: InboxIntegration[];
  creators: InboxCreator[];
  labels: EmailLabel[];
  unreadCount: number;
  /** true, wenn hinter `threads` noch weitere Seiten liegen (siehe `offset`). */
  hasMore: boolean;
};

export type InboxFilters = {
  search?: string;
  integrationId?: string;
  folder?: string;
  labelId?: string;
  unread?: boolean;
  category?: string;
  /** Für "Mehr laden" — wie viele Threads (in der aktuellen Sortierung/Filterung) übersprungen werden sollen. */
  offset?: number;
};

export type SmtpIntegration = {
  id: string;
  email: string;
  display_name: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  imap_username: string | null;
  imap_password: string;
};

export type ReplyInput = {
  threadId: string;
  body: string;
  senderDisplayName: string | null;
};
