// Minimal Twilio REST client for outbound WhatsApp (send-only).
// Uses the 2010-04-01 Messages API with HTTP Basic auth. No SDK dependency —
// a single form-encoded POST, same house style as smtp-client.server.ts.

const API_BASE = "https://api.twilio.com/2010-04-01";

export class TwilioError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
  }
}

function basicAuth(sid: string, token: string): string {
  return "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
}

type SendTemplateParams = {
  accountSid: string;
  authToken: string;
  to: string; // E.164, "whatsapp:" prefix added here
  contentSid: string; // HX...
  contentVariables: Record<string, string>; // { "1": "…" }
  from?: string; // E.164 sender; required unless messagingServiceSid
  messagingServiceSid?: string; // MG...
  statusCallback?: string; // future: delivery-status webhook
};

export const twilioClient = {
  /** Cheap credential probe — GET the account resource. */
  async checkAuth(accountSid: string, authToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/Accounts/${accountSid}.json`, {
      headers: { Authorization: basicAuth(accountSid, authToken) },
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { message?: string; code?: number };
      throw new TwilioError(
        json.message ?? `Twilio auth check failed (${res.status})`,
        res.status,
        json.code,
      );
    }
  },

  async sendTemplate(p: SendTemplateParams): Promise<{ sid: string; status: string }> {
    const body = new URLSearchParams();
    body.set("To", `whatsapp:${p.to}`);
    if (p.messagingServiceSid) body.set("MessagingServiceSid", p.messagingServiceSid);
    else if (p.from) body.set("From", `whatsapp:${p.from}`);
    else throw new TwilioError("Kein WhatsApp-Absender konfiguriert.", 400);
    body.set("ContentSid", p.contentSid);
    body.set("ContentVariables", JSON.stringify(p.contentVariables));
    if (p.statusCallback) body.set("StatusCallback", p.statusCallback);

    const res = await fetch(`${API_BASE}/Accounts/${p.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: basicAuth(p.accountSid, p.authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as {
      sid?: string;
      status?: string;
      message?: string;
      code?: number;
    };
    if (!res.ok) {
      throw new TwilioError(json.message ?? `Twilio error ${res.status}`, res.status, json.code);
    }
    return { sid: json.sid ?? "", status: json.status ?? "queued" };
  },
};
