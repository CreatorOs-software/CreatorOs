// sync-youtube – Supabase Edge Function
// Pulls YouTube channel stats + recent video metrics into creator_social_accounts / creator_social_snapshots.
// Triggered by: cron (all connected accounts) or POST { account_id } (single).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type AccountRow = {
  id: string;
  agency_id: string;
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
    .eq("provider", "google")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Google OAuth app credentials missing");
  return data as { client_id: string; client_secret: string };
}

async function refreshToken(account: AccountRow): Promise<string> {
  if (!account.refresh_token) throw new Error("No refresh token – reconnect required");
  const app = await getOAuthApp(account.agency_id);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: app.client_id,
      client_secret: app.client_secret,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json() as Record<string, string>;
  if (!res.ok) throw new Error(`Token refresh failed: ${json.error_description ?? json.error}`);
  await db.from("creator_social_accounts").update({
    access_token: json.access_token,
    token_expires_at: new Date(Date.now() + (Number(json.expires_in) - 60) * 1000).toISOString(),
  }).eq("id", account.id);
  return json.access_token;
}

async function getToken(account: AccountRow): Promise<string> {
  const exp = account.token_expires_at ? +new Date(account.token_expires_at) : 0;
  if (account.access_token && exp > Date.now() + 30_000) return account.access_token;
  return refreshToken(account);
}

async function ytFetch(account: AccountRow, url: string): Promise<unknown> {
  let token = await getToken(account);
  const doFetch = (t: string) => fetch(url, { headers: { Authorization: `Bearer ${t}` } });
  let res = await doFetch(token);
  if (res.status === 401) { token = await refreshToken(account); res = await doFetch(token); }
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `YouTube API ${res.status}: ${(json as Record<string, any>).error?.message ?? JSON.stringify(json)}`,
    );
  }
  return json;
}

// ---- Stats pull ----------------------------------------

async function pullChannelStats(
  account: AccountRow,
): Promise<{ followers: number; totalViews: number; recentPostCount: number }> {
  const chRes = await ytFetch(
    account,
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
  ) as Record<string, any>;

  const ch = chRes.items?.[0];
  if (!ch) throw new Error("No YouTube channel found for this account");

  const followers = Number(ch.statistics?.subscriberCount ?? 0);
  const totalViews = Number(ch.statistics?.viewCount ?? 0);
  const uploadsPlaylist: string | undefined = ch.contentDetails?.relatedPlaylists?.uploads;
  let recentPosts: Record<string, unknown>[] = [];
  let er: number | null = null;

  if (uploadsPlaylist) {
    const plRes = await ytFetch(
      account,
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=5&playlistId=${uploadsPlaylist}`,
    ) as Record<string, any>;

    const videoIds: string[] = (plRes.items ?? [])
      .map((it: Record<string, any>) => it.contentDetails?.videoId)
      .filter(Boolean);

    if (videoIds.length) {
      const vRes = await ytFetch(
        account,
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}`,
      ) as Record<string, any>;

      recentPosts = (vRes.items ?? []).map((v: Record<string, any>) => ({
        id: v.id,
        title: v.snippet?.title ?? "",
        published_at: v.snippet?.publishedAt ?? null,
        thumbnail: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.default?.url ?? null,
        views: Number(v.statistics?.viewCount ?? 0),
        likes: Number(v.statistics?.likeCount ?? 0),
        comments: Number(v.statistics?.commentCount ?? 0),
        url: `https://www.youtube.com/watch?v=${v.id}`,
      }));

      const sumViews = recentPosts.reduce((s, p) => s + (p.views as number), 0);
      const sumEng = recentPosts.reduce((s, p) => s + (p.likes as number) + (p.comments as number), 0);
      er = sumViews > 0 ? +((sumEng / sumViews) * 100).toFixed(2) : null;
    }
  }

  const handleStr = ch.snippet?.customUrl
    ? (ch.snippet.customUrl.startsWith("@") ? ch.snippet.customUrl : `@${ch.snippet.customUrl}`)
    : ch.snippet?.title ?? "channel";

  await db.from("creator_social_accounts").update({
    handle: handleStr,
    external_id: ch.id,
    followers,
    engagement_rate: er,
    total_views: totalViews,
    recent_posts: recentPosts,
    meta: {
      title: ch.snippet?.title,
      description: ch.snippet?.description,
      thumbnail: ch.snippet?.thumbnails?.default?.url,
      country: ch.snippet?.country,
    },
    last_synced_at: new Date().toISOString(),
    last_sync_error: null,
    status: "connected",
  }).eq("id", account.id);

  await db.from("creator_social_snapshots").insert({
    agency_id: account.agency_id,
    account_id: account.id,
    followers,
    engagement_rate: er,
  });

  return { followers, totalViews, recentPostCount: recentPosts.length };
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
  const accountId = body.account_id ?? null;

  let query = db
    .from("creator_social_accounts")
    .select("id, agency_id, access_token, refresh_token, token_expires_at")
    .eq("platform", "youtube")
    .eq("status", "connected")
    .not("refresh_token", "is", null);

  if (accountId) query = (query as ReturnType<typeof query.eq>).eq("id", accountId);

  const { data: rows, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: Record<string, unknown>[] = [];
  for (const row of (rows ?? []) as AccountRow[]) {
    try {
      const stats = await pullChannelStats(row);
      results.push({ id: row.id, ...stats });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 500);
      await db
        .from("creator_social_accounts")
        .update({ last_sync_error: msg, status: "error" })
        .eq("id", row.id);
      results.push({ id: row.id, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
