import { verifyWebhookSignature } from "@/lib/meta-whatsapp-client.server";
import { serviceClient } from "@/lib/supabase/service";
import { WhatsAppRepository } from "@/domains/whatsapp/repository";
import type { WhatsAppWebhookPayload } from "@/domains/whatsapp/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !verifyWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: WhatsAppWebhookPayload;
  try { payload = JSON.parse(rawBody) as WhatsAppWebhookPayload; }
  catch { return new Response("Invalid payload", { status: 400 }); }
  if (payload.object !== "whatsapp_business_account") return new Response("Ignored", { status: 200 });

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      const connection = await WhatsAppRepository.findConnectionByPhoneNumberId(serviceClient, phoneNumberId);
      if (!connection || connection.waba_id !== entry.id) continue;

      for (const message of value?.messages ?? []) {
        if (!message.id || !message.from) continue;
        const profileName = value?.contacts?.find((contact) => contact.wa_id === message.from)?.profile?.name ?? null;
        const receivedAt = fromUnixSeconds(message.timestamp);
        const existingContact = await WhatsAppRepository.findContact(serviceClient, connection.agency_id, message.from);
        await WhatsAppRepository.upsertInboundContact(serviceClient, {
          agency_id: connection.agency_id, wa_id: message.from, creator_id: existingContact?.creator_id ?? null,
          display_name: profileName, last_inbound_at: receivedAt, last_inbound_message_id: message.id,
        });
        await WhatsAppRepository.insertMessage(serviceClient, {
          agency_id: connection.agency_id, creator_id: null, thread_id: null,
          to_number: message.from,
          body: message.type === "text" ? message.text?.body ?? "" : `[${message.type ?? "unknown"}]`,
          provider: "meta", direction: "inbound", wa_message_id: message.id,
          status: "received", error: null, created_by: null,
        });
      }

      for (const statusEvent of value?.statuses ?? []) {
        if (!statusEvent.id || !["sent", "delivered", "read", "failed"].includes(statusEvent.status ?? "")) continue;
        const error = statusEvent.errors?.[0];
        await WhatsAppRepository.updateMessageStatus(
          serviceClient, statusEvent.id,
          statusEvent.status as "sent" | "delivered" | "read" | "failed",
          error ? error.message ?? error.title ?? `Meta-Fehler ${error.code ?? ""}` : null,
          fromUnixSeconds(statusEvent.timestamp),
        );
      }
    }
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
}

function fromUnixSeconds(value?: string): string {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}
