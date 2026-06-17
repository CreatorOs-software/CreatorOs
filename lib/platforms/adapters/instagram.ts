import type {
  PlatformAdapter,
  OAuthTokens,
  PlatformProfile,
  NormalizedMetrics,
} from "../types";

const IG_AUTH = "https://api.instagram.com/oauth/authorize";
const IG_TOKEN = "https://api.instagram.com/oauth/access_token";
const IG_LONG_LIVED = "https://graph.instagram.com/access_token";
const IG_REFRESH = "https://graph.instagram.com/refresh_access_token";
const IG_API = "https://graph.instagram.com/v21.0";

const SCOPES = "instagram_business_basic,instagram_business_manage_insights";

export class InstagramAdapter implements PlatformAdapter {
  platform = "instagram" as const;

  private get clientId() {
    return process.env.INSTAGRAM_CLIENT_ID!;
  }
  private get clientSecret() {
    return process.env.INSTAGRAM_CLIENT_SECRET!;
  }

  getAuthUrl({ state, redirectUri }: { state: string; redirectUri: string }) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      response_type: "code",
      state,
    });
    return `${IG_AUTH}?${params}`;
  }

  async exchangeCode({
    code,
    redirectUri,
  }: {
    code: string;
    state: string;
    redirectUri: string;
  }): Promise<OAuthTokens> {
    // Step 1: Exchange authorization code for short-lived token
    const shortRes = await fetch(IG_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!shortRes.ok) {
      const err = await shortRes.text();
      throw new Error(`Instagram short-lived token exchange failed: ${err}`);
    }

    const shortData = await shortRes.json();
    const shortToken: string = shortData.access_token;
    const userId: string = String(shortData.user_id);

    // Step 2: Exchange short-lived for long-lived token (~60 days)
    const longParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: this.clientSecret,
      access_token: shortToken,
    });

    const longRes = await fetch(`${IG_LONG_LIVED}?${longParams}`);

    if (!longRes.ok) {
      const err = await longRes.text();
      throw new Error(`Instagram long-lived token exchange failed: ${err}`);
    }

    const longData = await longRes.json();

    return {
      accessToken: longData.access_token,
      refreshToken: null, // Instagram has no refresh token; long-lived tokens are refreshed via /refresh_access_token
      expiresAt: longData.expires_in
        ? new Date(Date.now() + longData.expires_in * 1000)
        : null,
      scopes: SCOPES.split(","),
      platformUserId: userId,
    };
  }

  async fetchProfile(accessToken: string): Promise<PlatformProfile> {
    const params = new URLSearchParams({
      fields: "id,username,name,profile_picture_url",
      access_token: accessToken,
    });

    const res = await fetch(`${IG_API}/me?${params}`);
    if (!res.ok) throw new Error(`Instagram profile fetch failed: ${res.status}`);

    const data = await res.json();

    return {
      externalId: String(data.id),
      username: data.username ?? data.id,
      displayName: data.name ?? data.username ?? data.id,
      avatarUrl: data.profile_picture_url ?? null,
      profileUrl: `https://www.instagram.com/${data.username ?? data.id}`,
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
    const since = daysAgo(30);
    const until = today();

    const insightsParams = new URLSearchParams({
      metric: "views,reach,profile_views,follower_count",
      period: "day",
      since,
      until,
      access_token: accessToken,
    });

    const [profileRes, insightsRes] = await Promise.all([
      fetch(`${IG_API}/${externalId}?fields=followers_count,media_count&access_token=${accessToken}`),
      fetch(`${IG_API}/${externalId}/insights?${insightsParams}`),
    ]);

    if (!profileRes.ok) throw new Error(`Instagram profile fetch failed: ${profileRes.status}`);
    const profile = await profileRes.json();
    const followersCount: number = profile.followers_count ?? 0;
    const mediaCount: number = profile.media_count ?? 0;

    // Parse insights — each metric has a `values` array of daily data points
    let impressions30d = 0;
    let reach30d = 0;
    let profileViews30d = 0;
    let audienceDelta7d = 0;
    let audienceDelta30d = 0;

    if (insightsRes.ok) {
      const insights = await insightsRes.json();
      const metrics: { name: string; values: { value: number }[] }[] =
        insights.data ?? [];

      for (const metric of metrics) {
        const values = metric.values.map((v) => v.value);
        const sum = values.reduce((a, b) => a + b, 0);

        if (metric.name === "views") impressions30d = sum;
        if (metric.name === "reach") reach30d = sum;
        if (metric.name === "profile_views") profileViews30d = sum;
        if (metric.name === "follower_count") {
          // follower_count returns total per day → compute delta
          audienceDelta30d = values.length >= 2
            ? (values[values.length - 1] ?? 0) - (values[0] ?? 0)
            : 0;
          audienceDelta7d = values.length >= 8
            ? (values[values.length - 1] ?? 0) - (values[values.length - 8] ?? 0)
            : audienceDelta30d;
        }
      }
    }

    return {
      audience: followersCount,
      engagementRate: 0, // requires per-post data, not available from insights alone
      views30d: impressions30d,
      audienceDelta7d,
      audienceDelta30d,
      monthlyRevenue: null,
      raw: { reach30d, profileViews30d, mediaCount },
    };
  }

  // Instagram uses long-lived tokens (~60 days) that are refreshed via GET /refresh_access_token.
  // The `refreshToken` param here is actually the long-lived access token itself.
  async refreshToken(
    accessToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date | null }> {
    const params = new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: accessToken,
    });

    const res = await fetch(`${IG_REFRESH}?${params}`);
    if (!res.ok) throw new Error(`Instagram token refresh failed: ${res.status}`);

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
