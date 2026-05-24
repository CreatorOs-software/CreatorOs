// sync-google-calendar – Supabase Edge Function
// Bidirectional sync: pulls Google Calendar events into `events` table,
// pushes local-only events back to Google.
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
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  external_calendar_id: string | null;
  sync_token: string | null;
};

// ---- OAuth helpers ----------------------------------------

async function getOAuthApp(agency_id: string) {
  const { data, error } = await db
    .from("agency_oauth_apps")
    .select("client_id, client_secret")
    .eq("agency_id", agency_id)
    .eq("provider", "google")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Google OAuth app credentials missing");
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
  await db.from("calendar_integrations").update({
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

async function gFetch(
  integration: IntegrationRow,
  url: string,
  init: RequestInit = {},
): Promise<unknown> {
  let token = await getToken(integration);
  const doFetch = (t: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
    });
  let res = await doFetch(token);
  if (res.status === 401) { token = await refreshToken(integration); res = await doFetch(token); }
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Google API ${res.status}: ${(json as Record<string, any>).error?.message ?? JSON.stringify(json)}`,
    );
  }
  return json;
}

// ---- Event helpers ----------------------------------------

type EventType = "brand" | "deadline" | "internal" | "posting" | "shoot" | "travel";

function mapEventType(summary?: string): EventType {
  const s = (summary ?? "").toLowerCase();
  if (s.includes("shoot") || s.includes("dreh")) return "shoot";
  if (s.includes("brand") || s.includes("kampagne")) return "brand";
  if (s.includes("deadline") || s.includes("frist")) return "deadline";
  if (s.includes("travel") || s.includes("flight") || s.includes("flug")) return "travel";
  if (s.includes("post")) return "posting";
  return "internal";
}

// ---- Pull from Google ----------------------------------------

async function pullFromGoogle(
  integration: IntegrationRow,
): Promise<{ pulled: number; deleted: number; reset: boolean }> {
  const calId = integration.external_calendar_id ?? "primary";
  const base =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`;

  let url: string;
  if (integration.sync_token) {
    url = `${base}?syncToken=${encodeURIComponent(integration.sync_token)}&singleEvents=true`;
  } else {
    const timeMin = new Date(Date.now() - 30 * 86400_000).toISOString();
    url =
      `${base}?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&showDeleted=true&maxResults=250`;
  }

  let pulled = 0;
  let deleted = 0;
  let nextSyncToken: string | undefined;
  let pageToken: string | undefined;
  let resetSync = false;

  do {
    const fetchUrl = pageToken ? `${url}&pageToken=${encodeURIComponent(pageToken)}` : url;
    let json: Record<string, any>;
    try {
      json = await gFetch(integration, fetchUrl) as Record<string, any>;
    } catch (e) {
      if (String((e as Error).message).includes("410")) {
        resetSync = true;
        break;
      }
      throw e;
    }

    for (const ev of json.items ?? []) {
      if (ev.status === "cancelled") {
        await db.from("events")
          .delete()
          .eq("agency_id", integration.agency_id)
          .eq("external_provider", "google")
          .eq("external_id", ev.id);
        deleted++;
        continue;
      }
      const start = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
      const end = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null);
      if (!start) continue;

      const participants = (ev.attendees ?? []).map((a: Record<string, string>) => ({
        email: a.email,
        name: a.displayName ?? null,
        status: a.responseStatus ?? null,
      }));

      const payload = {
        agency_id: integration.agency_id,
        title: ev.summary ?? "(no title)",
        type: mapEventType(ev.summary),
        start_at: start,
        end_at: end,
        location: ev.location ?? null,
        notes: ev.description ?? null,
        participants,
        external_id: ev.id,
        external_provider: "google",
        external_etag: ev.etag ?? null,
      };

      const { data: existing } = await db
        .from("events")
        .select("id")
        .eq("agency_id", integration.agency_id)
        .eq("external_provider", "google")
        .eq("external_id", ev.id)
        .maybeSingle();

      if (existing) {
        await db.from("events").update(payload).eq("id", existing.id);
      } else {
        await db.from("events").insert(payload);
      }
      pulled++;
    }

    pageToken = json.nextPageToken;
    nextSyncToken = json.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  await db.from("calendar_integrations").update({
    sync_token: resetSync ? null : (nextSyncToken ?? integration.sync_token),
    last_sync_at: new Date().toISOString(),
    status: "connected",
    last_sync_error: null,
  }).eq("id", integration.id);

  return { pulled, deleted, reset: resetSync };
}

// ---- Push to Google ----------------------------------------

async function pushToGoogle(integration: IntegrationRow): Promise<{ pushed: number }> {
  const calId = integration.external_calendar_id ?? "primary";
  const { data: localEvents } = await db
    .from("events")
    .select("id, title, start_at, end_at, location, notes, participants")
    .eq("agency_id", integration.agency_id)
    .is("external_id", null)
    .gte("start_at", new Date(Date.now() - 7 * 86400_000).toISOString())
    .limit(50);

  let pushed = 0;
  for (const ev of localEvents ?? []) {
    const body = {
      summary: ev.title,
      description: ev.notes ?? undefined,
      location: ev.location ?? undefined,
      start: { dateTime: new Date(ev.start_at).toISOString() },
      end: {
        dateTime: new Date(
          ev.end_at ?? new Date(+new Date(ev.start_at) + 3_600_000).toISOString(),
        ).toISOString(),
      },
      attendees: Array.isArray(ev.participants)
        ? (ev.participants as Array<{ email?: string; name?: string }>)
          .filter((p) => p?.email)
          .map((p) => ({ email: p.email, displayName: p.name }))
        : undefined,
    };
    try {
      const created = await gFetch(
        integration,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
        { method: "POST", body: JSON.stringify(body) },
      ) as Record<string, string>;
      await db.from("events").update({
        external_id: created.id,
        external_provider: "google",
        external_etag: created.etag ?? null,
      }).eq("id", ev.id);
      pushed++;
    } catch (e) {
      console.error("push event failed", e);
    }
  }
  return { pushed };
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
    .from("calendar_integrations")
    .select(
      "id, agency_id, access_token, refresh_token, token_expires_at, external_calendar_id, sync_token",
    )
    .eq("status", "connected")
    .eq("provider", "google")
    .not("refresh_token", "is", null);

  if (integrationId) query = (query as ReturnType<typeof query.eq>).eq("id", integrationId);

  const { data: rows, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: Record<string, unknown>[] = [];
  for (const row of (rows ?? []) as IntegrationRow[]) {
    try {
      const pullRes = await pullFromGoogle(row);
      const pushRes = await pushToGoogle(row);
      results.push({ id: row.id, ...pullRes, ...pushRes });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 500);
      await db
        .from("calendar_integrations")
        .update({ status: "error", last_sync_error: msg })
        .eq("id", row.id);
      results.push({ id: row.id, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
