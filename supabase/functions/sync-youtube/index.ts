// sync-youtube – Supabase Edge Function
// Pulls YouTube channel stats into creator_account_metrics_current.
// Triggered by: pg_cron (all active YouTube accounts) or POST { account_id } (single).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const YT_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID")!;
const YT_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const YT_API = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS = "https://youtubeanalytics.googleapis.com/v2";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type AccountRow = {
  id: string;
  agency_id: string;
  external_id: string;
  sync_priority: number;
  connection: {
    access_token: string;
    refresh_token: string | null;
    token_expires_at: string | null;
  };
};

// ---- Helpers ----------------------------------------

function nextSyncAt(priority: number): string {
  const hours = priority === 1 ? 6 : priority === 2 ? 24 : 7 * 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ---- Token management ----------------------------------------

async function refreshAccessToken(account: AccountRow): Promise<string> {
  if (!account.connection.refresh_token) {
    throw new Error("No refresh token – reconnect required");
  }

  console.log(`[refresh] using client_id prefix: ${YT_CLIENT_ID?.slice(0, 20)}...`);

  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      refresh_token: account.connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const json = (await res.json()) as Record<string, string>;
  if (!res.ok) {
    throw new Error(
      `Token refresh failed: ${json.error_description ?? json.error}`,
    );
  }

  const expiresAt = new Date(
    Date.now() + (Number(json.expires_in) - 60) * 1000,
  ).toISOString();

  await db
    .from("platform_connections")
    .update({ access_token: json.access_token, token_expires_at: expiresAt })
    .eq("creator_account_id", account.id)
    .eq("status", "active");

  return json.access_token;
}

async function getAccessToken(account: AccountRow): Promise<string> {
  const exp = account.connection.token_expires_at
    ? +new Date(account.connection.token_expires_at)
    : 0;
  if (account.connection.access_token && exp > Date.now() + 30_000) {
    return account.connection.access_token;
  }
  return refreshAccessToken(account);
}

async function ytFetch(
  token: string,
  url: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (json.error as Record<string, unknown>)?.message ?? JSON.stringify(json);
    throw new Error(`YouTube API ${res.status}: ${msg}`);
  }
  return json;
}

// ---- Sync logic ----------------------------------------

async function syncAccount(account: AccountRow): Promise<void> {
  console.log(`[sync-youtube] start account=${account.id} channel=${account.external_id}`);

  const token = await getAccessToken(account);
  console.log(`[sync-youtube] token ok`);

  const analyticsBase =
    `${YT_ANALYTICS}/reports?ids=channel%3D%3D${account.external_id}` +
    `&startDate=${daysAgo(90)}&endDate=${today()}`;

  const [channelRes, totalsRes] = await Promise.all([
    ytFetch(token, `${YT_API}/channels?part=statistics&id=${account.external_id}`),
    ytFetch(
      token,
      analyticsBase +
        `&metrics=views,estimatedMinutesWatched,likes,comments,subscribersGained,subscribersLost,averageViewDuration`,
    ),
  ]);

  console.log(`[sync-youtube] api calls ok — channel items: ${(channelRes.items as unknown[])?.length ?? 0}, analytics rows: ${(totalsRes.rows as unknown[])?.length ?? 0}`);

  const stats =
    (((channelRes.items as unknown[])?.[0] as Record<string, unknown>)
      ?.statistics as Record<string, string>) ?? {};

  const row = (totalsRes.rows as number[][])?.[0] ?? [];

  const subscribers       = parseInt(stats.subscriberCount ?? "0", 10);
  const totalViews        = parseInt(stats.viewCount ?? "0", 10);
  const views30d          = row[0] ?? 0;
  const watchTimeMinutes  = row[1] ?? 0;
  const likes             = row[2] ?? 0;
  const comments          = row[3] ?? 0;
  const subscribersGained = row[4] ?? 0;
  const subscribersLost   = row[5] ?? 0;
  const avgViewDuration   = row[6] ?? 0;

  const engagementRate =
    views30d > 0
      ? Math.round(((likes + comments) / views30d) * 10000) / 100
      : 0;

  console.log(`[sync-youtube] metrics — subscribers=${subscribers} views30d=${views30d} gained=${subscribersGained} lost=${subscribersLost} avgDuration=${avgViewDuration}s er=${engagementRate}%`);

  const { error: upsertErr } = await db.from("creator_account_metrics_current").upsert({
    creator_account_id:     account.id,
    agency_id:              account.agency_id,
    audience:               subscribers,
    engagement_rate:        engagementRate,
    views_30d:              views30d,
    audience_growth_7d:     0,
    audience_growth_30d:    0,
    monthly_revenue:        null,
    subscribers_gained_30d: subscribersGained,
    subscribers_lost_30d:   subscribersLost,
    avg_view_duration_secs: avgViewDuration,
    watch_time_hours_30d:   Math.round((watchTimeMinutes / 60) * 100) / 100,
    raw: { totalViews },
    synced_at: new Date().toISOString(),
  });

  if (upsertErr) throw new Error(`metrics upsert failed: ${upsertErr.message}`);
  console.log(`[sync-youtube] metrics upserted ok`);

  const { error: updateErr } = await db
    .from("creator_accounts")
    .update({
      sync_status:     "active",
      last_sync_at:    new Date().toISOString(),
      last_sync_error: null,
      next_sync_at:    nextSyncAt(account.sync_priority),
    })
    .eq("id", account.id);

  if (updateErr) throw new Error(`account update failed: ${updateErr.message}`);
  console.log(`[sync-youtube] done account=${account.id}`);
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

  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const accountId = body.account_id ?? null;

  // Load accounts joined with their active connection (tokens)
  // deno-lint-ignore no-explicit-any
  let query = (db as any)
    .from("creator_accounts")
    .select(
      "id, agency_id, external_id, sync_priority, platform_connections!inner(access_token, refresh_token, token_expires_at)",
    )
    .eq("platform", "youtube")
    .neq("sync_status", "disconnected")
    .eq("platform_connections.status", "active");

  if (accountId) query = query.eq("id", accountId);

  const { data: rows, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  const results: Record<string, unknown>[] = [];

  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const conns = row.platform_connections as Record<string, unknown>[];
    const conn = Array.isArray(conns) ? conns[0] : conns;

    const account: AccountRow = {
      id: row.id as string,
      agency_id: row.agency_id as string,
      external_id: row.external_id as string,
      sync_priority: row.sync_priority as number,
      connection: conn as AccountRow["connection"],
    };

    try {
      await syncAccount(account);
      results.push({ id: account.id, ok: true });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 500);
      await db
        .from("creator_accounts")
        .update({
          sync_status: "error",
          last_sync_error: msg,
          last_sync_at: new Date().toISOString(),
          next_sync_at: nextSyncAt(account.sync_priority),
        })
        .eq("id", account.id);
      results.push({ id: account.id, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
