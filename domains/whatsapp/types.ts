export type WhatsAppProvider = "twilio" | "meta";

export type WhatsAppConnectionStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending"
  | "needs_reconnect";

/** Full row incl. secrets — server-only, never serialized to the client. */
export type WhatsAppConnectionRow = {
  id: string;
  agency_id: string;
  provider: WhatsAppProvider;
  status: WhatsAppConnectionStatus;

  // Legacy Twilio fields — historical only, never used to send.
  from_number: string | null;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  messaging_service_sid: string | null;
  content_sid: string | null;
  template_name: string | null;

  // Meta Cloud API fields
  waba_id: string | null;
  phone_number_id: string | null;
  business_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  access_token_encrypted: string | null;
  token_expires_at: string | null;
  webhook_subscribed_at: string | null;

  last_error: string | null;
  connected_at: string | null;
};

/** Redacted view returned to the settings UI / dialog gate — no tokens. */
export type WhatsAppConnectionPublic = {
  connected: boolean;
  status: WhatsAppConnectionStatus;
  provider: WhatsAppProvider;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  wabaId: string | null;
  connectedAt: string | null;
  lastError: string | null;
};

/** Data the client-side Embedded Signup flow hands back after the user
 * completes onboarding in Meta's popup. None of it is trusted as-is —
 * the server re-verifies WABA/phone ownership against the Graph API
 * before persisting anything. */
export type MetaOnboardingInput = {
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessId?: string | null;
  state: string;
};

export type SendToCreatorInput = {
  creatorId: string;
  threadId?: string | null;
  /** Freeform text — only sendable while a 24h service window is open. */
  body?: string;
  /** Approved template name (required outside the service window). */
  templateName?: string;
  /** Positional {{1}}, {{2}}, … body parameters for the template. */
  templateParams?: string[];
};

export type WhatsAppMessageRecord = {
  agency_id: string;
  creator_id: string | null;
  thread_id: string | null;
  to_number: string;
  body: string;
  provider: "meta";
  direction: "inbound" | "outbound";
  wa_message_id: string | null;
  status: "accepted" | "sent" | "failed" | "delivered" | "read" | "received";
  error: string | null;
  created_by: string | null;
};

export type CreatorContact = {
  full_name: string;
  phone: string | null;
  whatsapp_opt_in: boolean;
};

export type WhatsAppTemplate = {
  id: string;
  metaTemplateId: string;
  name: string;
  language: string;
  category: string;
  status: string;
  /** Number of positional parameters in the BODY component. */
  bodyParamCount: number;
};

export type WhatsAppContactRow = {
  agency_id: string;
  wa_id: string;
  creator_id: string | null;
  display_name: string | null;
  last_inbound_at: string | null;
  last_inbound_message_id: string | null;
};

// ─── Webhook payload (Meta Graph API, WABA "messages" field) ────────────────
// Deliberately loose — only the fields this app reads. Unknown/extra fields
// are ignored, never validated exhaustively (Meta adds fields over time).

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: {
    id?: string; // WABA id
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }[];
        statuses?: {
          id?: string;
          status?: string; // sent | delivered | read | failed
          timestamp?: string;
          recipient_id?: string;
          errors?: { code?: number; title?: string; message?: string }[];
        }[];
      };
    }[];
  }[];
};
