// Minimal server-only Meta WhatsApp Cloud API client (Graph API). No SDK
// dependency — plain fetch calls, matching the server-side HTTP clients.
//
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

import crypto from "crypto";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Verifies Meta's `X-Hub-Signature-256` header against the RAW request body.
 * Must run before any JSON parsing — the signature is computed over the raw
 * bytes, not the parsed/re-serialized object. Timing-safe compare.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader) return false;
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;
  const provided = signatureHeader.slice(prefix.length);

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const providedBuf = Buffer.from(provided, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message);
  }
}

type GraphErrorBody = {
  error?: { message?: string; code?: number; error_subcode?: number };
};

async function graphFetch<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & GraphErrorBody;
  if (!res.ok) {
    throw new MetaApiError(
      json.error?.message ?? `Meta API error ${res.status}`,
      res.status,
      json.error?.code,
      json.error?.error_subcode,
    );
  }
  return json;
}

// ─── Embedded Signup: token exchange ───────────────────────────────────────

export type ExchangeCodeParams = { appId: string; appSecret: string; code: string };
export type ExchangeCodeResult = { accessToken: string; tokenType: string; expiresIn: number | null };

export async function exchangeCodeForToken(
  p: ExchangeCodeParams,
): Promise<ExchangeCodeResult> {
  const params = new URLSearchParams({
    client_id: p.appId,
    client_secret: p.appSecret,
    code: p.code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  } & GraphErrorBody;
  if (!res.ok || !json.access_token) {
    throw new MetaApiError(
      json.error?.message ?? "Token-Austausch fehlgeschlagen.",
      res.status,
      json.error?.code,
    );
  }
  return {
    accessToken: json.access_token,
    tokenType: json.token_type ?? "bearer",
    expiresIn: json.expires_in ?? null,
  };
}

// ─── WABA / phone number verification ──────────────────────────────────────

export type WabaInfo = {
  id: string;
  name: string;
  ownerBusinessId: string | null;
};

export async function getWabaInfo(accessToken: string, wabaId: string): Promise<WabaInfo> {
  const json = await graphFetch<{
    id: string;
    name?: string;
    owner_business_info?: { id?: string };
  }>(`/${wabaId}?fields=id,name,owner_business_info`, { accessToken, method: "GET" });
  return {
    id: json.id,
    name: json.name ?? "",
    ownerBusinessId: json.owner_business_info?.id ?? null,
  };
}

export type PhoneNumberInfo = {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating: string | null;
  codeVerificationStatus: string | null;
};

export async function getPhoneNumberInfo(
  accessToken: string,
  phoneNumberId: string,
): Promise<PhoneNumberInfo> {
  const json = await graphFetch<{
    id: string;
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
    code_verification_status?: string;
  }>(
    `/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
    { accessToken, method: "GET" },
  );
  return {
    id: json.id,
    displayPhoneNumber: json.display_phone_number ?? "",
    verifiedName: json.verified_name ?? "",
    qualityRating: json.quality_rating ?? null,
    codeVerificationStatus: json.code_verification_status ?? null,
  };
}

/** Lists the phone numbers currently attached to a WABA — used to confirm a
 * claimed phone_number_id actually belongs to the claimed waba_id. */
export async function listWabaPhoneNumbers(
  accessToken: string,
  wabaId: string,
): Promise<{ id: string }[]> {
  const json = await graphFetch<{ data?: { id: string }[] }>(
    `/${wabaId}/phone_numbers?fields=id`,
    { accessToken, method: "GET" },
  );
  return json.data ?? [];
}

/** Subscribes this app to receive webhooks for the given WABA. Required once
 * per WABA after Embedded Signup, otherwise no webhook events arrive. */
export async function subscribeAppToWaba(accessToken: string, wabaId: string): Promise<void> {
  await graphFetch(`/${wabaId}/subscribed_apps`, { accessToken, method: "POST" });
}

// ─── Templates ──────────────────────────────────────────────────────────────

export type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: unknown[];
};

export async function listApprovedTemplates(
  accessToken: string,
  wabaId: string,
): Promise<MetaTemplate[]> {
  const json = await graphFetch<{
    data?: {
      id: string;
      name: string;
      language: string;
      category: string;
      status: string;
      components?: unknown[];
    }[];
  }>(`/${wabaId}/message_templates?fields=id,name,language,category,status,components&limit=100`, {
    accessToken,
    method: "GET",
  });
  return (json.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    language: t.language,
    category: t.category,
    status: t.status,
    components: t.components ?? [],
  }));
}

// ─── Sending ────────────────────────────────────────────────────────────────

export type TemplateComponentParam = { type: "text"; text: string };
export type TemplateComponent = { type: "body"; parameters: TemplateComponentParam[] };

export async function sendTemplateMessage(p: {
  accessToken: string;
  phoneNumberId: string;
  to: string; // E.164, no "whatsapp:" prefix on the Cloud API
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}): Promise<{ messageId: string }> {
  const json = await graphFetch<{ messages?: { id: string }[] }>(
    `/${p.phoneNumberId}/messages`,
    {
      accessToken: p.accessToken,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: p.to,
        type: "template",
        template: {
          name: p.templateName,
          language: { code: p.languageCode },
          ...(p.components && p.components.length > 0 ? { components: p.components } : {}),
        },
      }),
    },
  );
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new MetaApiError("Keine Message-ID in der Antwort.", 502);
  return { messageId };
}

/** Freeform text — only valid inside an open 24h customer service window. */
export async function sendTextMessage(p: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
}): Promise<{ messageId: string }> {
  const json = await graphFetch<{ messages?: { id: string }[] }>(
    `/${p.phoneNumberId}/messages`,
    {
      accessToken: p.accessToken,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: p.to,
        type: "text",
        text: { body: p.body },
      }),
    },
  );
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new MetaApiError("Keine Message-ID in der Antwort.", 502);
  return { messageId };
}
