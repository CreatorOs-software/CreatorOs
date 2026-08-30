export type WhatsAppConnectionStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

/** Full row incl. secrets — server-only, never serialized to the client. */
export type WhatsAppConnectionRow = {
  id: string;
  agency_id: string;
  status: WhatsAppConnectionStatus;
  from_number: string | null;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  messaging_service_sid: string | null;
  content_sid: string | null;
  template_name: string | null;
  last_error: string | null;
  connected_at: string | null;
};

/** Redacted view returned to the settings UI / dialog gate. */
export type WhatsAppConnectionPublic = {
  connected: boolean;
  status: WhatsAppConnectionStatus;
  fromNumber: string | null;
  templateName: string | null;
  accountSidLast4: string | null;
  source: "db" | "env";
  connectedAt: string | null;
  lastError: string | null;
};

export type WhatsAppConnectInput = {
  accountSid: string;
  authToken: string;
  fromNumber: string; // E.164
  contentSid: string; // HX...
  templateName?: string;
  messagingServiceSid?: string;
};

export type SendToCreatorInput = {
  creatorId: string;
  threadId?: string | null;
  body: string;
};

export type WhatsAppMessageRecord = {
  agency_id: string;
  creator_id: string | null;
  thread_id: string | null;
  to_number: string;
  body: string;
  content_sid: string | null;
  twilio_sid: string | null;
  status: "queued" | "sent" | "failed";
  error: string | null;
  created_by: string | null;
};

/** Resolved credentials used for a send (from the DB row or env). */
export type ResolvedWhatsAppCredentials = {
  accountSid: string;
  authToken: string;
  fromNumber: string | null;
  messagingServiceSid: string | null;
  contentSid: string;
};

export type CreatorContact = {
  full_name: string;
  phone: string | null;
  whatsapp_opt_in: boolean;
};
