import type { Platform } from "@/lib/platforms/types";

export type SyncStatus = "pending" | "active" | "error" | "disconnected";
export type InviteStatus = "pending" | "connected" | "expired" | "revoked";

export type CreatorAccount = {
  id: string;
  agency_id: string;
  creator_id: string;
  platform: Platform;
  external_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  is_verified: boolean;
  sync_status: SyncStatus;
  sync_priority: 1 | 2 | 3;
  last_sync_at: string | null;
  last_sync_error: string | null;
  next_sync_at: string | null;
  connected_at: string;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationInvite = {
  id: string;
  agency_id: string;
  creator_id: string;
  platform: Platform;
  // token_hash is never returned to clients — omitted from query selects
  status: InviteStatus;
  expires_at: string;
  created_by: string | null;
  accepted_at: string | null;
  creator_account_id: string | null;
  created_at: string;
};

export type MetricsCurrent = {
  creator_account_id: string;
  agency_id: string;
  // Cross-platform normalized fields
  audience: number;
  engagement_rate: number;
  views_30d: number;
  audience_growth_7d: number;
  audience_growth_30d: number;
  monthly_revenue: number | null;
  // Platform-specific extras (keyed by platform convention)
  raw: Record<string, unknown>;
  synced_at: string;
};

export type MetricsDaily = {
  id: string;
  creator_account_id: string;
  agency_id: string;
  platform: Platform;
  date: string;
  audience: number | null;
  engagement_rate: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  audience_delta: number | null;
  raw_data: Record<string, unknown>;
  created_at: string;
};

export type CreateInviteInput = {
  creatorId: string;
  platform: Platform;
  agencyId: string;
  createdBy: string;
};

export type ConnectAccountInput = {
  agencyId: string;
  creatorId: string;
  platform: Platform;
  externalId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  isVerified: boolean;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
  connectedBy: string | null;
  inviteId: string | null;
};
