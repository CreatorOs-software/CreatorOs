import type { Platform, PlatformAdapter } from "./types";
import { YouTubeAdapter } from "./adapters/youtube";
import { InstagramAdapter } from "./adapters/instagram";

// Add adapter instances here as platforms are implemented.
// Any platform NOT in this map will reject at API layer.
const ADAPTERS: Partial<Record<Platform, PlatformAdapter>> = {
  youtube: new YouTubeAdapter(),
  instagram: new InstagramAdapter(),
  // tiktok: new TikTokAdapter(),
  // spotify: new SpotifyAdapter(),
  // twitch: new TwitchAdapter(),
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = ADAPTERS[platform];
  if (!adapter)
    throw new Error(`No adapter registered for platform: ${platform}`);
  return adapter;
}

export function getSupportedPlatforms(): Platform[] {
  return Object.keys(ADAPTERS) as Platform[];
}

export function isSupported(platform: string): platform is Platform {
  return platform in ADAPTERS;
}

// Display metadata — safe to send to the client
export const PLATFORM_META: Record<
  Platform,
  { label: string; color: string; oauthSupported: boolean }
> = {
  youtube: { label: "YouTube", color: "#FF0000", oauthSupported: true },
  instagram: { label: "Instagram", color: "#E1306C", oauthSupported: true },
  tiktok: { label: "TikTok", color: "#000000", oauthSupported: false },
  spotify: { label: "Spotify", color: "#1DB954", oauthSupported: false },
  onlyfans: { label: "OnlyFans", color: "#00AFF0", oauthSupported: false },
  x: { label: "X", color: "#000000", oauthSupported: false },
};
