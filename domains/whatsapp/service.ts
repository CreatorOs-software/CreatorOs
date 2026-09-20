import { getAuthContext, can } from "@/domains/auth";
import {
  exchangeCodeForToken, getPhoneNumberInfo, getWabaInfo, listApprovedTemplates,
  listWabaPhoneNumbers, MetaApiError, sendTemplateMessage, sendTextMessage,
  subscribeAppToWaba,
} from "@/lib/meta-whatsapp-client.server";
import { decryptSecret, encryptSecret } from "@/lib/secret-box.server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { isValidE164, normalizeE164 } from "@/lib/formatters";
import { WhatsAppRepository } from "./repository";
import type {
  MetaOnboardingInput, SendToCreatorInput, WhatsAppConnectionPublic,
  WhatsAppConnectionRow, WhatsAppMessageRecord, WhatsAppTemplate,
} from "./types";

export class WhatsAppError extends Error {}

type MetaCredentials = { accessToken: string; phoneNumberId: string; wabaId: string };

function metaConfig(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new WhatsAppError("Die Meta-App ist serverseitig noch nicht konfiguriert.");
  return { appId, appSecret };
}

function connectionView(row: WhatsAppConnectionRow | null): WhatsAppConnectionPublic {
  // A present-but-expired token must not read as "connected" — resolveCredentials()
  // already rejects it for sending, so the status shown here has to agree,
  // otherwise the settings page keeps showing a green checkmark while every
  // send silently fails with "please reconnect".
  const tokenExpired = Boolean(row?.token_expires_at && new Date(row.token_expires_at) <= new Date());
  const connected = row?.provider === "meta" && row.status === "connected" &&
    Boolean(row.phone_number_id && row.waba_id && row.access_token_encrypted) && !tokenExpired;
  const status = tokenExpired && row?.status === "connected" ? "needs_reconnect" : (row?.status ?? "pending");
  return {
    connected, status, provider: row?.provider ?? "meta",
    displayPhoneNumber: row?.display_phone_number ?? null,
    verifiedName: row?.verified_name ?? null, wabaId: row?.waba_id ?? null,
    connectedAt: row?.connected_at ?? null, lastError: row?.last_error ?? null,
  };
}

function resolveCredentials(row: WhatsAppConnectionRow | null): MetaCredentials {
  if (!row || row.provider !== "meta" || row.status !== "connected" ||
      !row.access_token_encrypted || !row.phone_number_id || !row.waba_id) {
    throw new WhatsAppError("WhatsApp ist für diese Agentur nicht verbunden.");
  }
  if (row.token_expires_at && new Date(row.token_expires_at) <= new Date()) {
    throw new WhatsAppError("Die WhatsApp-Verbindung ist abgelaufen. Bitte erneut verbinden.");
  }
  try {
    return {
      accessToken: decryptSecret(row.access_token_encrypted),
      phoneNumberId: row.phone_number_id, wabaId: row.waba_id,
    };
  } catch {
    throw new WhatsAppError("Die WhatsApp-Verbindung muss erneut hergestellt werden.");
  }
}

async function authFor(permission: "edit_integrations" | "edit_communication") {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!can(auth.role, auth.permissions, permission)) {
    throw new WhatsAppError("Keine Berechtigung für diese WhatsApp-Aktion.");
  }
  return { ...auth, supabase };
}

async function auditSafe(row: WhatsAppMessageRecord): Promise<void> {
  try { await WhatsAppRepository.insertMessage(serviceClient, row); } catch {}
}

function providerError(error: unknown, fallback: string): WhatsAppError {
  if (error instanceof MetaApiError) {
    return new WhatsAppError(error.status === 401
      ? "WhatsApp-Verbindung ungültig. Bitte erneut verbinden."
      : error.message);
  }
  if (error instanceof WhatsAppError) return error;
  return new WhatsAppError(fallback);
}

async function syncTemplatesForAgency(agencyId: string, credentials: MetaCredentials): Promise<WhatsAppTemplate[]> {
  const templates = await listApprovedTemplates(credentials.accessToken, credentials.wabaId);
  await WhatsAppRepository.replaceTemplates(serviceClient, agencyId, templates.map((template) => ({
    meta_template_id: template.id, name: template.name, language: template.language,
    category: template.category, status: template.status, components: template.components,
  })));
  return WhatsAppRepository.listTemplates(serviceClient, agencyId);
}

export const WhatsAppService = {
  async getConnection(): Promise<WhatsAppConnectionPublic> {
    const { agencyId } = await authFor("edit_communication");
    return connectionView(await WhatsAppRepository.findConnection(serviceClient, agencyId));
  },

  async connect(input: MetaOnboardingInput): Promise<WhatsAppConnectionPublic> {
    const { agencyId, userId } = await authFor("edit_integrations");
    const { appId, appSecret } = metaConfig();
    try {
      const token = await exchangeCodeForToken({ appId, appSecret, code: input.code });
      const [waba, phone, wabaPhones] = await Promise.all([
        getWabaInfo(token.accessToken, input.wabaId),
        getPhoneNumberInfo(token.accessToken, input.phoneNumberId),
        listWabaPhoneNumbers(token.accessToken, input.wabaId),
      ]);
      if (!wabaPhones.some(({ id }) => id === input.phoneNumberId)) {
        throw new WhatsAppError("Die gewählte Telefonnummer gehört nicht zum gewählten WhatsApp-Konto.");
      }
      if (input.businessId && waba.ownerBusinessId && input.businessId !== waba.ownerBusinessId) {
        throw new WhatsAppError("Das WhatsApp-Konto gehört nicht zum übermittelten Unternehmen.");
      }
      await subscribeAppToWaba(token.accessToken, input.wabaId);
      const row = await WhatsAppRepository.upsertConnection(serviceClient, agencyId, {
        provider: "meta", status: "connected", waba_id: input.wabaId,
        phone_number_id: input.phoneNumberId,
        business_id: waba.ownerBusinessId ?? input.businessId ?? null,
        display_phone_number: phone.displayPhoneNumber, verified_name: phone.verifiedName,
        from_number: phone.displayPhoneNumber, access_token_encrypted: encryptSecret(token.accessToken),
        token_expires_at: token.expiresIn ? new Date(Date.now() + token.expiresIn * 1000).toISOString() : null,
        webhook_subscribed_at: new Date().toISOString(), last_error: null,
        connected_at: new Date().toISOString(), twilio_auth_token: null, created_by: userId,
      });
      await syncTemplatesForAgency(agencyId, resolveCredentials(row));
      return connectionView(row);
    } catch (error) {
      throw providerError(error, "WhatsApp-Verbindung fehlgeschlagen.");
    }
  },

  async disconnect(): Promise<void> {
    const { agencyId } = await authFor("edit_integrations");
    await WhatsAppRepository.disconnectConnection(serviceClient, agencyId);
  },

  async listTemplates(): Promise<WhatsAppTemplate[]> {
    const { agencyId } = await authFor("edit_communication");
    return WhatsAppRepository.listTemplates(serviceClient, agencyId);
  },

  async syncTemplates(): Promise<WhatsAppTemplate[]> {
    const { agencyId } = await authFor("edit_integrations");
    const credentials = resolveCredentials(await WhatsAppRepository.findConnection(serviceClient, agencyId));
    try {
      return await syncTemplatesForAgency(agencyId, credentials);
    } catch (error) {
      throw providerError(error, "WhatsApp-Vorlagen konnten nicht synchronisiert werden.");
    }
  },

  async sendToCreator(input: SendToCreatorInput): Promise<{ messageId: string }> {
    const { agencyId, userId, supabase } = await authFor("edit_communication");
    const credentials = resolveCredentials(await WhatsAppRepository.findConnection(serviceClient, agencyId));
    const contact = await WhatsAppRepository.findCreatorContact(supabase, agencyId, input.creatorId);
    if (!contact) throw new WhatsAppError("Creator nicht gefunden.");
    if (input.threadId && !(await WhatsAppRepository.threadBelongsToAgency(supabase, agencyId, input.threadId))) {
      throw new WhatsAppError("Der Vorgang gehört nicht zu dieser Agentur.");
    }
    const phone = normalizeE164(contact.phone);
    if (!phone || !isValidE164(phone)) throw new WhatsAppError(`Für ${contact.full_name} ist keine gültige WhatsApp-Nummer hinterlegt.`);
    if (!contact.whatsapp_opt_in) throw new WhatsAppError(`${contact.full_name} hat WhatsApp-Nachrichten nicht zugestimmt.`);

    const waContact = await WhatsAppRepository.findContact(serviceClient, agencyId, phone.replace(/^\+/, ""));
    const windowOpen = Boolean(waContact?.last_inbound_at) &&
      Date.now() - new Date(waContact!.last_inbound_at!).getTime() < 24 * 60 * 60 * 1000;
    const body = input.body?.trim() ?? "";
    let template: WhatsAppTemplate | null = null;
    if (!windowOpen) {
      if (!input.templateName) throw new WhatsAppError("Das 24-Stunden-Servicefenster ist geschlossen. Bitte eine freigegebene Meta-Vorlage wählen.");
      template = await WhatsAppRepository.findTemplate(serviceClient, agencyId, input.templateName);
      if (!template || template.status !== "APPROVED") throw new WhatsAppError("Die gewählte WhatsApp-Vorlage ist nicht freigegeben.");
      if ((input.templateParams?.length ?? 0) !== template.bodyParamCount) {
        throw new WhatsAppError(`Die Vorlage erwartet ${template.bodyParamCount} Parameter.`);
      }
    } else if (!body) {
      throw new WhatsAppError("Nachricht fehlt.");
    }

    try {
      const result = template
        ? await sendTemplateMessage({
            accessToken: credentials.accessToken, phoneNumberId: credentials.phoneNumberId,
            to: phone, templateName: template.name, languageCode: template.language,
            components: template.bodyParamCount ? [{
              type: "body", parameters: (input.templateParams ?? []).map((text) => ({ type: "text", text })),
            }] : undefined,
          })
        : await sendTextMessage({
            accessToken: credentials.accessToken, phoneNumberId: credentials.phoneNumberId,
            to: phone, body,
          });
      await auditSafe({
        agency_id: agencyId, creator_id: input.creatorId, thread_id: input.threadId ?? null,
        to_number: phone, body: template ? `Template: ${template.name}` : body,
        provider: "meta", direction: "outbound", wa_message_id: result.messageId,
        status: "accepted", error: null, created_by: userId,
      });
      return result;
    } catch (error) {
      const message = providerError(error, "WhatsApp-Versand fehlgeschlagen.").message;
      await auditSafe({
        agency_id: agencyId, creator_id: input.creatorId, thread_id: input.threadId ?? null,
        to_number: phone, body: template ? `Template: ${template.name}` : body,
        provider: "meta", direction: "outbound", wa_message_id: null,
        status: "failed", error: message, created_by: userId,
      });
      throw new WhatsAppError(message);
    }
  },
};
