import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SocialAccountRepository } from "./repository";
import { getAdapter, isSupported } from "@/lib/platforms/registry";
import type { Platform } from "@/lib/platforms/types";
import type { CreatorAccount, IntegrationInvite } from "./types";

export class SocialAccountService {
  private repo: SocialAccountRepository;

  constructor(supabase: SupabaseClient) {
    this.repo = new SocialAccountRepository(supabase);
  }

  // ----------------------------------------------------------------
  // Invite flow
  // ----------------------------------------------------------------

  async createInvite(params: {
    agencyId: string;
    creatorId: string;
    platform: string;
    createdBy: string;
  }): Promise<{ invite: IntegrationInvite; inviteUrl: string; rawToken: string }> {
    if (!isSupported(params.platform)) {
      throw new Error(`Platform '${params.platform}' does not support OAuth yet`);
    }

    // 32 random bytes → 64-char hex token sent in the link
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const invite = await this.repo.createInvite({
      agencyId: params.agencyId,
      creatorId: params.creatorId,
      platform: params.platform,
      tokenHash,
      createdBy: params.createdBy,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/connect/${params.platform}/${rawToken}`;

    return { invite, inviteUrl, rawToken };
  }

  async validateInviteToken(
    rawToken: string,
  ): Promise<{ invite: IntegrationInvite; platform: Platform } | null> {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const invite = await this.repo.findInviteByTokenHash(tokenHash);

    if (!invite) return null;
    if (invite.status !== "pending") return null;
    if (new Date(invite.expires_at) < new Date()) return null;

    return { invite, platform: invite.platform as Platform };
  }

  async getInvitesForCreator(creatorId: string): Promise<IntegrationInvite[]> {
    return this.repo.findInvitesByCreator(creatorId);
  }

  async revokeInvite(inviteId: string): Promise<void> {
    await this.repo.revokeInvite(inviteId);
  }

  // ----------------------------------------------------------------
  // OAuth connect flow (called after callback)
  // ----------------------------------------------------------------

  async handleOAuthCallback(params: {
    rawToken: string;  // from state param
    platform: Platform;
    code: string;
    redirectUri: string;
    connectedBy: string | null;
  }): Promise<CreatorAccount> {
    // 1. Validate invite
    const result = await this.validateInviteToken(params.rawToken);
    if (!result) throw new Error("Invalid or expired invite token");
    if (result.platform !== params.platform) {
      throw new Error("Platform mismatch between token and callback");
    }

    const { invite } = result;
    const adapter = getAdapter(params.platform);

    // 2. Exchange code → tokens
    const tokens = await adapter.exchangeCode({
      code: params.code,
      state: params.rawToken,
      redirectUri: params.redirectUri,
    });

    // 3. Fetch public profile
    const profile = await adapter.fetchProfile(tokens.accessToken);

    // 4. Persist account + tokens
    const account = await this.repo.connectAccount({
      agencyId: invite.agency_id,
      creatorId: invite.creator_id,
      platform: params.platform,
      externalId: profile.externalId,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
      isVerified: profile.isVerified,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      connectedBy: params.connectedBy,
      inviteId: invite.id,
    });

    // 5. Mark invite as used
    await this.repo.markInviteConnected(invite.id, account.id);

    return account;
  }

  // ----------------------------------------------------------------
  // Account management
  // ----------------------------------------------------------------

  async getAccountsForCreator(creatorId: string): Promise<CreatorAccount[]> {
    return this.repo.findByCreator(creatorId);
  }

  async disconnectAccount(accountId: string): Promise<void> {
    await this.repo.disconnectAccount(accountId);
  }

  // ----------------------------------------------------------------
  // Sync (called by Edge Function via service role client)
  // ----------------------------------------------------------------

  async syncAccount(accountId: string): Promise<void> {
    const account = await this.repo.findById(accountId);
    if (!account || account.sync_status !== "active") return;

    const connection = await this.repo.findConnection(accountId);
    if (!connection?.access_token) {
      await this.repo.updateSyncResult(accountId, {
        error: "No active connection found",
        nextSyncAt: nextSyncTime(account.sync_priority as 1 | 2 | 3),
      });
      return;
    }

    const adapter = getAdapter(account.platform as Platform);
    let accessToken = connection.access_token;

    // Refresh if token expires within 5 minutes
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      if (expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
        if (!connection.refresh_token) {
          await this.repo.updateSyncResult(accountId, {
            error: "Token expired, no refresh token",
            nextSyncAt: nextSyncTime(account.sync_priority as 1 | 2 | 3),
          });
          return;
        }
        const refreshed = await adapter.refreshToken(connection.refresh_token);
        accessToken = refreshed.accessToken;
        // Token update happens in platform_connections via service role — done here inline
      }
    }

    try {
      const metrics = await adapter.syncMetrics({
        accessToken,
        refreshToken: connection.refresh_token,
        externalId: account.external_id,
      });

      await this.repo.upsertCurrentMetrics(accountId, account.agency_id, {
        audience: metrics.audience,
        engagementRate: metrics.engagementRate,
        views30d: metrics.views30d,
        audienceDelta7d: metrics.audienceDelta7d,
        audienceDelta30d: metrics.audienceDelta30d,
        monthlyRevenue: metrics.monthlyRevenue,
        raw: metrics.raw,
      });

      await this.repo.updateSyncResult(accountId, {
        nextSyncAt: nextSyncTime(account.sync_priority as 1 | 2 | 3),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.updateSyncResult(accountId, {
        error: message,
        nextSyncAt: nextSyncTime(account.sync_priority as 1 | 2 | 3),
      });
    }
  }
}

// Maps sync priority → next sync interval
function nextSyncTime(priority: 1 | 2 | 3): Date {
  const hours = priority === 1 ? 6 : priority === 2 ? 24 : 7 * 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
