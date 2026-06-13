// Platform-agnostic adapter contract.
// Every platform implements PlatformAdapter — callers only see this interface.

export type Platform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "spotify"
  | "onlyfans"
  | "x";

// Normalized metrics — platform-agnostic, stored in creator_account_metrics_current
export type NormalizedMetrics = {
  audience: number; // subscribers / followers / listeners / fans
  engagementRate: number; // 0-100 percentage
  views30d: number; // plays / streams / views last 30 days
  audienceDelta7d: number; // absolute growth last 7 days
  audienceDelta30d: number;
  monthlyRevenue: number | null;
  raw: Record<string, unknown>; // platform-specific extras for storage
};

export type PlatformProfile = {
  externalId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  isVerified: boolean;
};

export type OAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
  platformUserId: string;
};

export interface PlatformAdapter {
  platform: Platform;

  // Build the OAuth redirect URL shown to the creator
  getAuthUrl(params: { state: string; redirectUri: string }): string;

  // Exchange auth code → tokens after redirect
  exchangeCode(params: {
    code: string;
    state: string;
    redirectUri: string;
  }): Promise<OAuthTokens>;

  // Fetch creator's public profile (called immediately after exchange)
  fetchProfile(accessToken: string): Promise<PlatformProfile>;

  // Full metrics sync (called by sync engine)
  syncMetrics(params: {
    accessToken: string;
    refreshToken: string | null;
    externalId: string;
  }): Promise<NormalizedMetrics>;

  // Refresh an expired access token
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date | null;
  }>;
}
