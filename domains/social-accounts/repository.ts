import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatorAccount,
  IntegrationInvite,
  MetricsCurrent,
  MetricsDaily,
  ConnectAccountInput,
} from "./types";

// Selects that intentionally omit sensitive columns
const INVITE_SAFE_COLUMNS =
  "id, agency_id, creator_id, platform, status, expires_at, created_by, accepted_at, creator_account_id, created_at";

export class SocialAccountRepository {
  constructor(private supabase: SupabaseClient) {}

  // ----------------------------------------------------------------
  // creator_accounts
  // ----------------------------------------------------------------

  async findByCreator(creatorId: string): Promise<CreatorAccount[]> {
    const { data, error } = await this.supabase
      .from("creator_accounts")
      .select("*")
      .eq("creator_id", creatorId)
      .neq("sync_status", "disconnected")
      .order("connected_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as CreatorAccount[];
  }

  async findById(id: string): Promise<CreatorAccount | null> {
    const { data, error } = await this.supabase
      .from("creator_accounts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data as CreatorAccount | null;
  }

  async connectAccount(input: ConnectAccountInput): Promise<CreatorAccount> {
    // Upsert the public profile row first
    const { data: account, error: accErr } = await this.supabase
      .from("creator_accounts")
      .upsert(
        {
          agency_id: input.agencyId,
          creator_id: input.creatorId,
          platform: input.platform,
          external_id: input.externalId,
          username: input.username,
          display_name: input.displayName,
          avatar_url: input.avatarUrl,
          profile_url: input.profileUrl,
          is_verified: input.isVerified,
          sync_status: "active",
          connected_at: new Date().toISOString(),
          disconnected_at: null,
        },
        { onConflict: "creator_id,platform,external_id" },
      )
      .select()
      .single();

    if (accErr) throw accErr;

    // Upsert the sensitive token row — service role required on this table
    const { error: connErr } = await this.supabase
      .from("platform_connections")
      .upsert(
        {
          agency_id: input.agencyId,
          creator_account_id: account.id,
          platform: input.platform,
          access_token: input.accessToken,
          refresh_token: input.refreshToken,
          token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
          scopes: input.scopes,
          status: "active",
          connected_by: input.connectedBy,
        },
        { onConflict: "creator_account_id" },
      );

    if (connErr) throw connErr;

    return account as CreatorAccount;
  }

  async disconnectAccount(id: string): Promise<void> {
    const { error: accErr } = await this.supabase
      .from("creator_accounts")
      .update({ sync_status: "disconnected", disconnected_at: new Date().toISOString() })
      .eq("id", id);

    if (accErr) throw accErr;

    const { error: connErr } = await this.supabase
      .from("platform_connections")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("creator_account_id", id);

    if (connErr) throw connErr;
  }

  // Used by the sync engine (service role) to read tokens
  async findConnection(creatorAccountId: string) {
    const { data, error } = await this.supabase
      .from("platform_connections")
      .select("*")
      .eq("creator_account_id", creatorAccountId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateSyncResult(
    id: string,
    result: { error?: string; nextSyncAt: Date },
  ): Promise<void> {
    const { error } = await this.supabase
      .from("creator_accounts")
      .update({
        sync_status: result.error ? "error" : "active",
        last_sync_at: new Date().toISOString(),
        last_sync_error: result.error ?? null,
        next_sync_at: result.nextSyncAt.toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
  }

  // ----------------------------------------------------------------
  // integration_invites
  // ----------------------------------------------------------------

  async findInvitesByCreator(creatorId: string): Promise<IntegrationInvite[]> {
    const { data, error } = await this.supabase
      .from("integration_invites")
      .select(INVITE_SAFE_COLUMNS)
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as IntegrationInvite[];
  }

  async findInviteByTokenHash(tokenHash: string): Promise<IntegrationInvite | null> {
    const { data, error } = await this.supabase
      .from("integration_invites")
      .select(INVITE_SAFE_COLUMNS)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    return data as IntegrationInvite | null;
  }

  async createInvite(params: {
    agencyId: string;
    creatorId: string;
    platform: string;
    tokenHash: string;
    createdBy: string;
  }): Promise<IntegrationInvite> {
    const { data, error } = await this.supabase
      .from("integration_invites")
      .insert({
        agency_id: params.agencyId,
        creator_id: params.creatorId,
        platform: params.platform,
        token_hash: params.tokenHash,
        created_by: params.createdBy,
      })
      .select(INVITE_SAFE_COLUMNS)
      .single();

    if (error) throw error;
    return data as IntegrationInvite;
  }

  async markInviteConnected(
    inviteId: string,
    creatorAccountId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("integration_invites")
      .update({
        status: "connected",
        accepted_at: new Date().toISOString(),
        creator_account_id: creatorAccountId,
      })
      .eq("id", inviteId);

    if (error) throw error;
  }

  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await this.supabase
      .from("integration_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId);

    if (error) throw error;
  }

  // ----------------------------------------------------------------
  // Metrics
  // ----------------------------------------------------------------

  async upsertCurrentMetrics(
    creatorAccountId: string,
    agencyId: string,
    metrics: {
      audience: number;
      engagementRate: number;
      views30d: number;
      audienceDelta7d: number;
      audienceDelta30d: number;
      monthlyRevenue: number | null;
      raw: Record<string, unknown>;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from("creator_account_metrics_current")
      .upsert({
        creator_account_id: creatorAccountId,
        agency_id: agencyId,
        audience: metrics.audience,
        engagement_rate: metrics.engagementRate,
        views_30d: metrics.views30d,
        audience_growth_7d: metrics.audienceDelta7d,
        audience_growth_30d: metrics.audienceDelta30d,
        monthly_revenue: metrics.monthlyRevenue,
        raw: metrics.raw,
        synced_at: new Date().toISOString(),
      });

    if (error) throw error;
  }

  async insertDailyMetrics(rows: {
    creatorAccountId: string;
    agencyId: string;
    platform: string;
    date: string;
    audience: number;
    engagementRate: number;
    views: number;
    audienceDelta: number;
    raw: Record<string, unknown>;
  }[]): Promise<void> {
    const { error } = await this.supabase.from("creator_account_metrics_daily").upsert(
      rows.map((r) => ({
        creator_account_id: r.creatorAccountId,
        agency_id: r.agencyId,
        platform: r.platform,
        date: r.date,
        audience: r.audience,
        engagement_rate: r.engagementRate,
        views: r.views,
        audience_delta: r.audienceDelta,
        raw_data: r.raw,
      })),
      { onConflict: "creator_account_id,date" },
    );

    if (error) throw error;
  }

  async findCurrentMetrics(creatorId: string): Promise<MetricsCurrent[]> {
    const { data, error } = await this.supabase
      .from("creator_account_metrics_current")
      .select("*, creator_accounts!inner(creator_id)")
      .eq("creator_accounts.creator_id", creatorId);

    if (error) throw error;
    return (data ?? []) as unknown as MetricsCurrent[];
  }

  async findDailyMetrics(
    creatorAccountId: string,
    from: string,
    to: string,
  ): Promise<MetricsDaily[]> {
    const { data, error } = await this.supabase
      .from("creator_account_metrics_daily")
      .select("*")
      .eq("creator_account_id", creatorAccountId)
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    if (error) throw error;
    return (data ?? []) as MetricsDaily[];
  }
}
