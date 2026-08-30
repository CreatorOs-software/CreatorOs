import { getAuthContext, can } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { isValidE164, normalizeE164 } from "@/lib/formatters";
import { WhatsAppRepository } from "./repository";
import type {
  ResolvedWhatsAppCredentials,
  SendToCreatorInput,
  WhatsAppConnectInput,
  WhatsAppConnectionPublic,
  WhatsAppConnectionRow,
  WhatsAppMessageRecord,
} from "./types";

export class WhatsAppError extends Error {}

const TEST_BODY = "Test von TalentOS ✅";

// ─── Credential resolution ────────────────────────────────────────────────────

function envCredentials(): ResolvedWhatsAppCredentials | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const contentSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM ?? null;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID ?? null;
  if (!accountSid || !authToken || !contentSid) return null;
  if (!fromNumber && !messagingServiceSid) return null;
  return { accountSid, authToken, contentSid, fromNumber, messagingServiceSid };
}

function rowCredentials(
  row: WhatsAppConnectionRow | null,
): ResolvedWhatsAppCredentials | null {
  if (!row || row.status !== "connected") return null;
  if (!row.twilio_account_sid || !row.twilio_auth_token || !row.content_sid) return null;
  if (!row.from_number && !row.messaging_service_sid) return null;
  return {
    accountSid: row.twilio_account_sid,
    authToken: row.twilio_auth_token,
    contentSid: row.content_sid,
    fromNumber: row.from_number,
    messagingServiceSid: row.messaging_service_sid,
  };
}

async function resolveCredentials(
  agencyId: string,
): Promise<{ creds: ResolvedWhatsAppCredentials; source: "db" | "env" }> {
  const row = await WhatsAppRepository.findConnection(serviceClient, agencyId);
  const fromRow = rowCredentials(row);
  if (fromRow) return { creds: fromRow, source: "db" };
  const fromEnv = envCredentials();
  if (fromEnv) return { creds: fromEnv, source: "env" };
  throw new WhatsAppError("WhatsApp ist für diese Agentur nicht verbunden.");
}

async function connectionView(agencyId: string): Promise<WhatsAppConnectionPublic> {
  const row = await WhatsAppRepository.findConnection(serviceClient, agencyId);
  const fromRow = rowCredentials(row);
  if (fromRow) {
    return {
      connected: true,
      status: "connected",
      fromNumber: row?.from_number ?? null,
      templateName: row?.template_name ?? null,
      accountSidLast4: fromRow.accountSid.slice(-4),
      source: "db",
      connectedAt: row?.connected_at ?? null,
      lastError: row?.last_error ?? null,
    };
  }
  const fromEnv = envCredentials();
  if (fromEnv) {
    return {
      connected: true,
      status: "connected",
      fromNumber: fromEnv.fromNumber,
      templateName: process.env.TWILIO_WHATSAPP_TEMPLATE_NAME ?? null,
      accountSidLast4: fromEnv.accountSid.slice(-4),
      source: "env",
      connectedAt: null,
      lastError: null,
    };
  }
  return {
    connected: false,
    status: row?.status ?? "pending",
    fromNumber: row?.from_number ?? null,
    templateName: row?.template_name ?? null,
    accountSidLast4: null,
    source: "env",
    connectedAt: null,
    lastError: row?.last_error ?? null,
  };
}

async function assertCanEdit(): Promise<{ agencyId: string; userId: string }> {
  const supabase = await createClient();
  const { agencyId, userId, role, permissions } = await getAuthContext(supabase);
  if (!can(role, permissions, "edit_integrations")) {
    throw new WhatsAppError("Keine Berechtigung für WhatsApp-Einstellungen.");
  }
  return { agencyId, userId };
}

async function auditSafe(row: WhatsAppMessageRecord): Promise<void> {
  try {
    await WhatsAppRepository.insertMessage(serviceClient, row);
  } catch {
    // best-effort — the message is already sent; a log failure must not surface
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const WhatsAppService = {
  async getConnection(): Promise<WhatsAppConnectionPublic> {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return connectionView(agencyId);
  },

  async connect(input: WhatsAppConnectInput): Promise<WhatsAppConnectionPublic> {
    const { agencyId, userId } = await assertCanEdit();

    if (!isValidE164(input.fromNumber)) {
      throw new WhatsAppError("Absendernummer muss im Format +49… (E.164) sein.");
    }
    if (!input.contentSid.startsWith("HX")) {
      throw new WhatsAppError("Template-SID muss mit „HX“ beginnen.");
    }

    const { twilioClient, TwilioError } = await import("@/lib/twilio-client.server");
    try {
      await twilioClient.checkAuth(input.accountSid, input.authToken);
    } catch (e) {
      if (e instanceof TwilioError) {
        throw new WhatsAppError("Twilio-Zugangsdaten ungültig.");
      }
      throw e;
    }

    await WhatsAppRepository.upsertConnection(serviceClient, agencyId, {
      status: "connected",
      from_number: input.fromNumber,
      twilio_account_sid: input.accountSid,
      twilio_auth_token: input.authToken,
      messaging_service_sid: input.messagingServiceSid ?? null,
      content_sid: input.contentSid,
      template_name: input.templateName ?? null,
      last_error: null,
      connected_at: new Date().toISOString(),
      created_by: userId,
    });

    return connectionView(agencyId);
  },

  async disconnect(): Promise<void> {
    const { agencyId } = await assertCanEdit();
    await WhatsAppRepository.disconnectConnection(serviceClient, agencyId);
  },

  async sendTest(toNumber: string): Promise<{ sid: string }> {
    const { agencyId, userId } = await assertCanEdit();
    if (!isValidE164(toNumber)) {
      throw new WhatsAppError("Testnummer muss im Format +49… (E.164) sein.");
    }
    const { creds } = await resolveCredentials(agencyId);
    const { twilioClient, TwilioError } = await import("@/lib/twilio-client.server");

    try {
      const { sid } = await twilioClient.sendTemplate({
        accountSid: creds.accountSid,
        authToken: creds.authToken,
        from: creds.fromNumber ?? undefined,
        messagingServiceSid: creds.messagingServiceSid ?? undefined,
        to: toNumber,
        contentSid: creds.contentSid,
        contentVariables: { "1": TEST_BODY },
      });
      await auditSafe({
        agency_id: agencyId,
        creator_id: null,
        thread_id: null,
        to_number: toNumber,
        body: TEST_BODY,
        content_sid: creds.contentSid,
        twilio_sid: sid,
        status: "sent",
        error: null,
        created_by: userId,
      });
      return { sid };
    } catch (e) {
      const message =
        e instanceof TwilioError ? e.message : "WhatsApp-Test fehlgeschlagen.";
      await auditSafe({
        agency_id: agencyId,
        creator_id: null,
        thread_id: null,
        to_number: toNumber,
        body: TEST_BODY,
        content_sid: creds.contentSid,
        twilio_sid: null,
        status: "failed",
        error: message,
        created_by: userId,
      });
      throw new WhatsAppError(message);
    }
  },

  async sendToCreator(input: SendToCreatorInput): Promise<{ sid: string }> {
    const body = input.body?.trim();
    if (!body) throw new WhatsAppError("Nachricht fehlt.");

    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);

    const { creds } = await resolveCredentials(agencyId);

    const contact = await WhatsAppRepository.findCreatorContact(
      supabase,
      agencyId,
      input.creatorId,
    );
    if (!contact) throw new WhatsAppError("Creator nicht gefunden.");

    const phone = normalizeE164(contact.phone);
    if (!phone) {
      throw new WhatsAppError(
        `Für ${contact.full_name} ist keine gültige WhatsApp-Nummer hinterlegt.`,
      );
    }
    if (!contact.whatsapp_opt_in) {
      throw new WhatsAppError(
        `${contact.full_name} hat WhatsApp-Nachrichten nicht zugestimmt.`,
      );
    }

    const { twilioClient, TwilioError } = await import("@/lib/twilio-client.server");

    let sid: string;
    try {
      ({ sid } = await twilioClient.sendTemplate({
        accountSid: creds.accountSid,
        authToken: creds.authToken,
        from: creds.fromNumber ?? undefined,
        messagingServiceSid: creds.messagingServiceSid ?? undefined,
        to: phone,
        contentSid: creds.contentSid,
        contentVariables: { "1": body },
      }));
    } catch (e) {
      const message =
        e instanceof TwilioError ? e.message : "WhatsApp-Versand fehlgeschlagen.";
      await auditSafe({
        agency_id: agencyId,
        creator_id: input.creatorId,
        thread_id: input.threadId ?? null,
        to_number: phone,
        body,
        content_sid: creds.contentSid,
        twilio_sid: null,
        status: "failed",
        error: message,
        created_by: userId,
      });
      throw new WhatsAppError(message);
    }

    await auditSafe({
      agency_id: agencyId,
      creator_id: input.creatorId,
      thread_id: input.threadId ?? null,
      to_number: phone,
      body,
      content_sid: creds.contentSid,
      twilio_sid: sid,
      status: "sent",
      error: null,
      created_by: userId,
    });

    return { sid };
  },
};
