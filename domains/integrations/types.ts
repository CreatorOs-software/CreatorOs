export type EmailIntegration = {
  id: string;
  agency_id: string;
  provider: "gmail" | "outlook" | "imap";
  email: string;
  display_name: string | null;
  status: "connected" | "disconnected" | "error";
  last_sync_at: string | null;
  connected_at: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_username: string;
  imap_password: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  creator_id: string | null;
  created_by: string;
};

export type IntegrationInsert = {
  email: string;
  display_name: string | null;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_username: string;
  imap_password: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  provider: "gmail" | "outlook" | "imap";
  provider_label?: string;
};

export type IntegrationPatch = {
  creator_id?: string | null;
  display_name?: string | null;
};

export type SyncResult = {
  ok: boolean;
  pulled: number;
  skipped: number;
};
