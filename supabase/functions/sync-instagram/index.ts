// sync-instagram – Supabase Edge Function
// Pulls Instagram Business metrics into creator_account_metrics_current.
// Triggered by: pg_cron (all active Instagram accounts) or POST { account_id } (single).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IG_REFRESH = "https://graph.instagram.com/refresh_access_token";
const IG_API = "https://graph.instagram.com/v21.0";

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

function msAgo(days: number) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ---- Token management ----------------------------------------

async function refreshAccessToken(account: AccountRow): Promise<string> {
  const currentToken = account.connection.access_token;
  if (!currentToken) throw new Error("No access token — reconnect required");

  console.log(`[refresh-instagram] refreshing long-lived token for account=${account.id}`);

  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: currentToken,
  });

  const res = await fetch(`${IG_REFRESH}?${params}`);
  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      `Instagram token refresh failed: ${json.error_description ?? json.error ?? JSON.stringify(json)}`,
    );
  }

  const newToken = json.access_token as string;
  const expiresIn = Number(json.expires_in ?? 0);
  const expiresAt = new Date(Date.now() + (expiresIn - 300) * 1000).toISOString();

  await db
    .from("platform_connections")
    .update({ access_token: newToken, token_expires_at: expiresAt })
    .eq("creator_account_id", account.id)
    .eq("status", "active");

  return newToken;
}

async function getAccessToken(account: AccountRow): Promise<string> {
  const exp = account.connection.token_expires_at
    ? +new Date(account.connection.token_expires_at)
    : 0;
  if (account.connection.access_token && exp > Date.now() + 7 * 24 * 60 * 60 * 1000) {
    return account.connection.access_token;
  }
  return refreshAccessToken(account);
}

async function igFetch(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errObj = json.error as Record<string, unknown> | undefined;
    const msg = errObj?.message ?? JSON.stringify(json);
    throw new Error(`Instagram API ${res.status}: ${msg}`);
  }
  return json;
}

// ---- Demographics helpers ----------------------------------------

type DemographicEntry = { name: string; value: number };
type DemResult = { dimension_values: string[]; value: number };
type DemBreakdown = { results: DemResult[] };
type DemTotalValue = { breakdowns: DemBreakdown[] };
type DemMetric = { total_value: DemTotalValue };

function parseDemBreakdown(data: Record<string, unknown> | null): DemographicEntry[] {
  if (!data) return [];
  const results =
    (data.data as DemMetric[])?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  return results.map((r) => ({
    name: String(r.dimension_values?.[0] ?? "unknown"),
    value: Number(r.value ?? 0),
  }));
}

// ---- Sync logic ----------------------------------------

async function syncAccount(account: AccountRow): Promise<void> {
  console.log(`[sync-instagram] start account=${account.id} ig_user=${account.external_id}`);

  const token = await getAccessToken(account);
  console.log(`[sync-instagram] token ok`);

  const since = daysAgo(30);
  const until = today();
  const uid = account.external_id;

  // ---- Phase 1: profile + day-period account insights ----
  const insightsParams = new URLSearchParams({
    metric: "views,reach,profile_views,follower_count,website_clicks",
    period: "day",
    since,
    until,
    access_token: token,
  });

  const [profileData, insightsData] = await Promise.all([
    igFetch(`${IG_API}/${uid}?fields=followers_count,media_count&access_token=${token}`),
    igFetch(`${IG_API}/${uid}/insights?${insightsParams}`),
  ]);

  console.log(`[sync-instagram] phase1 ok`);

  const followersCount = Number(profileData.followers_count ?? 0);
  const mediaCount = Number(profileData.media_count ?? 0);

  type InsightMetric = { name: string; values: { value: number }[] };
  const metrics: InsightMetric[] = (insightsData.data as InsightMetric[]) ?? [];

  let views30d = 0;
  let reach30d = 0;
  let profileViews30d = 0;
  let websiteClicks30d = 0;
  let websiteClicks7d = 0;
  let audienceDelta7d = 0;
  let audienceDelta30d = 0;

  for (const metric of metrics) {
    const values = metric.values.map((v) => v.value);
    const sum = values.reduce((a, b) => a + b, 0);

    if (metric.name === "views") views30d = sum;
    if (metric.name === "reach") reach30d = sum;
    if (metric.name === "profile_views") profileViews30d = sum;
    if (metric.name === "website_clicks") {
      websiteClicks30d = sum;
      websiteClicks7d = values.slice(-7).reduce((a, b) => a + b, 0);
    }
    if (metric.name === "follower_count") {
      audienceDelta30d = values.length >= 2
        ? (values[values.length - 1] ?? 0) - (values[0] ?? 0)
        : 0;
      audienceDelta7d = values.length >= 8
        ? (values[values.length - 1] ?? 0) - (values[values.length - 8] ?? 0)
        : audienceDelta30d;
    }
  }

  // ---- Phase 2: media, stories, demographics (all optional) ----
  const demBreakdown = (b: string) =>
    `${IG_API}/${uid}/insights?metric=follower_demographics&period=lifetime&breakdown=${b}&access_token=${token}`;

  const [mediaData, storiesData, genderData, ageData, countryData, cityData] =
    await Promise.all([
      igFetch(
        `${IG_API}/${uid}/media?fields=id,media_type,timestamp,insights.metric(reach,views)&limit=100&access_token=${token}`,
      ).catch(() => null),
      igFetch(
        `${IG_API}/${uid}/stories?fields=id,insights.metric(views,reach)&access_token=${token}`,
      ).catch(() => null),
      igFetch(demBreakdown("gender")).catch(() => null),
      igFetch(demBreakdown("age")).catch(() => null),
      igFetch(demBreakdown("country")).catch(() => null),
      igFetch(demBreakdown("city")).catch(() => null),
    ]);

  console.log(`[sync-instagram] phase2 ok`);

  // ---- Process media: feed posts + reel reach in last 30d ----
  type MediaInsightValue = { value: number };
  type MediaInsightRow = { name: string; values: MediaInsightValue[] };
  type MediaItem = {
    media_type: string;
    timestamp: string;
    insights?: { data: MediaInsightRow[] };
  };

  const mediaItems = (mediaData?.data as MediaItem[]) ?? [];
  const cutoff30d = msAgo(30);
  let reelReach30d = 0;
  let feedPosts30d = 0;

  for (const item of mediaItems) {
    if (new Date(item.timestamp).getTime() < cutoff30d) continue;

    const insightList: MediaInsightRow[] = item.insights?.data ?? [];
    const getVal = (name: string) =>
      Number(insightList.find((d) => d.name === name)?.values?.[0]?.value ?? 0);

    if (item.media_type === "REELS" || item.media_type === "REEL") {
      reelReach30d += getVal("reach");
    }
    if (["IMAGE", "VIDEO", "CAROUSEL_ALBUM"].includes(item.media_type)) {
      feedPosts30d++;
    }
  }

  // ---- Process stories: sum views from currently-live stories ----
  type StoryItem = { insights?: { data: MediaInsightRow[] } };
  const storyItems = (storiesData?.data as StoryItem[]) ?? [];
  let storyViews = 0;
  for (const story of storyItems) {
    const insightList: MediaInsightRow[] = story.insights?.data ?? [];
    storyViews += Number(
      insightList.find((d) => d.name === "views")?.values?.[0]?.value ?? 0,
    );
  }

  // ---- Demographics ----
  const demographics = {
    gender: parseDemBreakdown(genderData),
    age: parseDemBreakdown(ageData),
    countries: parseDemBreakdown(countryData),
    cities: parseDemBreakdown(cityData),
  };

  console.log(
    `[sync-instagram] metrics — followers=${followersCount} views30d=${views30d} reach30d=${reach30d} ` +
      `clicks30d=${websiteClicks30d} reelReach30d=${reelReach30d} feedPosts30d=${feedPosts30d} ` +
      `storyViews=${storyViews} delta7d=${audienceDelta7d}`,
  );

  const { error: upsertErr } = await db
    .from("creator_account_metrics_current")
    .upsert({
      creator_account_id: account.id,
      agency_id: account.agency_id,
      audience: followersCount,
      engagement_rate: 0,
      views_30d: views30d,
      audience_growth_7d: audienceDelta7d,
      audience_growth_30d: audienceDelta30d,
      monthly_revenue: null,
      subscribers_gained_30d: 0,
      subscribers_lost_30d: 0,
      avg_view_duration_secs: 0,
      watch_time_hours_30d: 0,
      raw: {
        reach30d,
        profileViews30d,
        mediaCount,
        websiteClicks7d,
        websiteClicks30d,
        storyViews,
        reelReach30d,
        feedPosts30d,
        demographics,
      },
      synced_at: new Date().toISOString(),
    });

  if (upsertErr) throw new Error(`metrics upsert failed: ${upsertErr.message}`);
  console.log(`[sync-instagram] metrics upserted ok`);

  const { error: updateErr } = await db
    .from("creator_accounts")
    .update({
      sync_status: "active",
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
      next_sync_at: nextSyncAt(account.sync_priority),
    })
    .eq("id", account.id);

  if (updateErr) throw new Error(`account update failed: ${updateErr.message}`);
  console.log(`[sync-instagram] done account=${account.id}`);
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

  const baseQuery = db
    .from("creator_accounts")
    .select(
      "id, agency_id, external_id, sync_priority, platform_connections!inner(access_token, refresh_token, token_expires_at)",
    )
    .eq("platform", "instagram")
    .neq("sync_status", "disconnected")
    .eq("platform_connections.status", "active");

  const { data: rows, error } = await (accountId
    ? baseQuery.eq("id", accountId)
    : baseQuery);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
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
