import type {
  PlatformAdapter,
  OAuthTokens,
  PlatformProfile,
  NormalizedMetrics,
} from "../types";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const YT_API = "https://www.googleapis.com/youtube/v3";
const YT_ANALYTICS = "https://youtubeanalytics.googleapis.com/v2";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

export class YouTubeAdapter implements PlatformAdapter {
  platform = "youtube" as const;

  private get clientId() {
    return process.env.YOUTUBE_CLIENT_ID!;
  }
  private get clientSecret() {
    return process.env.YOUTUBE_CLIENT_SECRET!;
  }

  getAuthUrl({ state, redirectUri }: { state: string; redirectUri: string }) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent", // always request refresh_token
      state,
    });
    return `${GOOGLE_AUTH}?${params}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    state: string;
    redirectUri: string;
  }): Promise<OAuthTokens> {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube token exchange failed: ${err}`);
    }

    const data = await res.json();

    // Temporarily empty — filled after fetchProfile()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
      scopes: data.scope?.split(" ") ?? [],
      platformUserId: "",
    };
  }

  async fetchProfile(accessToken: string): Promise<PlatformProfile> {
    const res = await fetch(
      `${YT_API}/channels?part=snippet,statistics&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) throw new Error(`YouTube profile fetch failed: ${res.status}`);
    const data = await res.json();
    const channel = data.items?.[0];
    if (!channel) throw new Error("No YouTube channel found for this account");

    return {
      externalId: channel.id,
      username: channel.snippet.customUrl ?? channel.snippet.title,
      displayName: channel.snippet.title,
      avatarUrl: channel.snippet.thumbnails?.default?.url ?? null,
      profileUrl: `https://youtube.com/channel/${channel.id}`,
      isVerified: false,
    };
  }

  async syncMetrics({
    accessToken,
    externalId,
  }: {
    accessToken: string;
    refreshToken: string | null;
    externalId: string;
  }): Promise<NormalizedMetrics> {
    const [channelRes, analyticsRes] = await Promise.all([
      fetch(`${YT_API}/channels?part=statistics&id=${externalId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(
        `${YT_ANALYTICS}/reports?ids=channel%3D%3D${externalId}` +
          `&startDate=${daysAgo(30)}&endDate=${today()}` +
          `&metrics=views,estimatedMinutesWatched,likes,comments`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    ]);

    const stats = (await channelRes.json()).items?.[0]?.statistics ?? {};
    const analytics = await analyticsRes.json();
    const row: number[] = analytics.rows?.[0] ?? [];

    const subscribers = parseInt(stats.subscriberCount ?? "0", 10);
    const totalViews = parseInt(stats.viewCount ?? "0", 10);
    const views30d = row[0] ?? 0;
    const watchTime = row[1] ?? 0;
    const likes = row[2] ?? 0;
    const comments = row[3] ?? 0;
    const engagementRate =
      views30d > 0 ? Math.round(((likes + comments) / views30d) * 10000) / 100 : 0;

    return {
      audience: subscribers,
      engagementRate,
      views30d,
      // Delta calculation requires yesterday's snapshot — done in sync engine
      audienceDelta7d: 0,
      audienceDelta30d: 0,
      monthlyRevenue: null, // requires AdSense API — separate integration
      raw: { totalViews, watchTimeMinutes: watchTime },
    };
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date | null }> {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) throw new Error(`YouTube token refresh failed: ${res.status}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
    };
  }
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
