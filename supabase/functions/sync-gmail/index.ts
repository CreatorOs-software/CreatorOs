// sync-gmail – Supabase Edge Function
// Pulls new Gmail messages via the Gmail REST API into email_threads.
// Triggered by: cron (all connected integrations) or POST { integration_id } (single).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type IntegrationRow = {
  id: string;
  agency_id: string;
  email: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

// ---- OAuth helpers ----------------------------------------

async function getOAuthApp(agency_id: string) {
  const { data, error } = await db
    .from("agency_oauth_apps")
    .select("client_id, client_secret")
    .eq("agency_id", agency_id)
    .eq("provider", "gmail")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Gmail OAuth app credentials missing");
  return data as { client_id: string; client_secret: string };
}

async function refreshToken(integration: IntegrationRow): Promise<string> {
  if (!integration.refresh_token) throw new Error("No refresh token – reconnect required");
  const app = await getOAuthApp(integration.agency_id);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: app.client_id,
      client_secret: app.client_secret,
      refresh_token: integration.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json() as Record<string, string>;
  if (!res.ok) throw new Error(`Token refresh failed: ${json.error_description ?? json.error}`);
  await db.from("email_integrations").update({
    access_token: json.access_token,
    token_expires_at: new Date(Date.now() + (Number(json.expires_in) - 60) * 1000).toISOString(),
  }).eq("id", integration.id);
  return json.access_token;
}

async function getToken(integration: IntegrationRow): Promise<string> {
  const exp = integration.token_expires_at ? +new Date(integration.token_expires_at) : 0;
  if (integration.access_token && exp > Date.now() + 30_000) return integration.access_token;
  return refreshToken(integration);
}

async function gFetch(integration: IntegrationRow, url: string): Promise<unknown> {
  let token = await getToken(integration);
  const doFetch = (t: string) => fetch(url, { headers: { Authorization: `Bearer ${t}` } });
  let res = await doFetch(token);
  if (res.status === 401) { token = await refreshToken(integration); res = await doFetch(token); }
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Gmail API ${res.status}: ${(json as Record<string, any>).error?.message ?? JSON.stringify(json)}`);
  }
  return json;
}

// ---- Message parsing ----------------------------------------

function decodeBase64Url(s: string): string {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
    return new TextDecoder("utf-8").decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string | null {
  return headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function extractBody(payload: Record<string, any>): { text: string; html: string } {
  let text = "";
  let html = "";
  const walk = (p: Record<string, any>) => {
    if (!p) return;
    const mt = (p.mimeType ?? "").toLowerCase();
    const data = p.body?.data;
    if (data && mt === "text/plain" && !text) text = decodeBase64Url(data);
    else if (data && mt === "text/html" && !html) html = decodeBase64Url(data);
    for (const part of p.parts ?? []) walk(part);
  };
  walk(payload);
  return { text, html };
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFrom(from: string): { name: string | null; email: string } {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: from.trim().toLowerCase() };
}

// ---- Core pull logic ----------------------------------------

async function pullGmail(integration: IntegrationRow): Promise<{ pulled: number; skipped: number }> {
  const q = encodeURIComponent("in:inbox -from:me newer_than:60d");
  const list = await gFetch(
    integration,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${q}`,
  ) as { messages?: Array<{ id: string; threadId: string }> };

  const messageIds = list.messages ?? [];
  let pulled = 0;
  let skipped = 0;

  for (const m of messageIds) {
    const { data: dup } = await db
      .from("email_threads")
      .select("id")
      .eq("agency_id", integration.agency_id)
      .eq("gmail_thread_id", m.threadId)
      .maybeSingle();
    if (dup) { skipped++; continue; }

    const msg = await gFetch(
      integration,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
    ) as Record<string, any>;

    const headers = msg.payload?.headers ?? [];
    const subject = getHeader(headers, "Subject") ?? "(no subject)";
    const fromRaw = getHeader(headers, "From") ?? "";
    const dateRaw = getHeader(headers, "Date");
    const { name, email } = parseFrom(fromRaw);
    const { text, html } = extractBody(msg.payload ?? {});
    const body = text || stripHtml(html);
    const snippet: string = msg.snippet ?? body.slice(0, 240);
    const labelIds: string[] = msg.labelIds ?? [];

    const { error } = await db.from("email_threads").insert({
      agency_id: integration.agency_id,
      gmail_thread_id: m.threadId,
      sender_email: email,
      sender_name: name,
      subject,
      preview: snippet,
      body: body || snippet,
      body_html: html || null,
      received_at: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
      unread: labelIds.includes("UNREAD"),
      starred: labelIds.includes("STARRED"),
      priority: labelIds.includes("IMPORTANT") ? "high" : "med",
    });
    if (error) { console.error("insert failed", error); continue; }
    pulled++;
  }

  await db.from("email_integrations").update({
    last_sync_at: new Date().toISOString(),
    status: "connected",
    last_sync_error: null,
  }).eq("id", integration.id);

  return { pulled, skipped };
}

// ---- Entry point ----------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || auth.slice(7) !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const integrationId = body.integration_id ?? null;

  let query = db
    .from("email_integrations")
    .select("id, agency_id, email, access_token, refresh_token, token_expires_at")
    .eq("status", "connected")
    .eq("provider", "gmail")
    .not("refresh_token", "is", null);

  if (integrationId) query = (query as ReturnType<typeof query.eq>).eq("id", integrationId);

  const { data: rows, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: Record<string, unknown>[] = [];
  for (const row of (rows ?? []) as IntegrationRow[]) {
    try {
      const res = await pullGmail(row);
      results.push({ id: row.id, email: row.email, ...res });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 500);
      await db
        .from("email_integrations")
        .update({ status: "error", last_sync_error: msg })
        .eq("id", row.id);
      results.push({ id: row.id, email: row.email, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
