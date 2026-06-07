export type EmailThread = {
  id: string;
  agency_id: string;
  integration_id: string;
  folder: string;
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
  gmail_thread_id: string | null;
};

export type ThreadPatch = {
  unread?: boolean;
  starred?: boolean;
  priority?: "low" | "med" | "high";
};

export type InboxCreator = {
  id: string;
  full_name: string;
  initials: string;
  color: string;
};

export type InboxIntegration = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  status: string;
  creator_id: string | null;
};

export type InboxPageData = {
  threads: EmailThread[];
  integrations: InboxIntegration[];
  creators: InboxCreator[];
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
