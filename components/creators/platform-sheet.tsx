"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Link2Off, Loader2, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { AvatarCreator } from "@/components/ui/avatar-creator";
import {
  PLATFORM_ICONS,
  PLATFORM_KEY,
  PLATFORM_LABEL,
  OAUTH_SUPPORTED,
} from "@/components/creators/dashboard/constants";
import { fmt as fmtNum } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CreatorAccount, MetricsCurrent } from "@/domains/social-accounts/types";
import type { Creator } from "./creator-sheet";

interface PlatformSheetProps {
  creator: Creator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformSheet({ creator, open, onOpenChange }: PlatformSheetProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [disconnectConfirmId, setDisconnectConfirmId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: accountsData } = useQuery<{ accounts: CreatorAccount[] }>({
    queryKey: ["creator-accounts", creator?.id],
    queryFn: () =>
      fetch(`/api/creators/${creator!.id}/accounts`).then((r) => r.json()),
    enabled: open && !!creator,
    staleTime: 60_000,
  });

  const { data: metricsData } = useQuery<{
    accounts: CreatorAccount[];
    metrics: Record<string, { current: MetricsCurrent | null; daily: unknown[] }>;
  }>({
    queryKey: ["creator-metrics-sheet", creator?.id],
    queryFn: () =>
      fetch(`/api/creators/${creator!.id}/metrics`).then((r) => r.json()),
    enabled: open && !!creator,
    staleTime: 5 * 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: ({ accountId, platform }: { accountId: string; platform: string }) =>
      fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, platform }),
      }).then((r) => {
        if (!r.ok) throw new Error("Sync fehlgeschlagen");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-accounts", creator?.id] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      fetch(`/api/integrations/${accountId}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Trennen fehlgeschlagen");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-accounts", creator?.id] });
      queryClient.invalidateQueries({ queryKey: ["creator-metrics-sheet", creator?.id] });
      setDisconnectConfirmId(null);
    },
  });

  async function handleCreateInvite(platformKey: string) {
    if (!creator) return;
    setInviteLoading(platformKey);
    setInviteError(null);
    try {
      const res = await fetch("/api/integrations/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_id: creator.id, platform: platformKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Fehler beim Erstellen des Links");
      } else {
        setInviteUrl(data.invite_url);
      }
    } catch {
      setInviteError("Netzwerkfehler");
    } finally {
      setInviteLoading(null);
    }
  }

  const connectedByKey = new Set<string>(
    (accountsData?.accounts ?? [])
      .filter((a) => a.sync_status !== "disconnected")
      .map((a) => a.platform as string),
  );

  const hasInsights = (metricsData?.accounts ?? []).some(
    (a) => metricsData?.metrics[a.id]?.current,
  );

  if (!creator) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 overflow-hidden"
          style={{ width: "480px", maxWidth: "95vw" }}
        >
          <SheetHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <AvatarCreator initials={creator.initials} color={creator.color} size="md" />
              <div>
                <SheetTitle>{creator.full_name}</SheetTitle>
                {creator.handle && (
                  <SheetDescription>@{creator.handle}</SheetDescription>
                )}
              </div>
            </div>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-6">
            {/* Verbundene Schnittstellen */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Verbundene Schnittstellen
              </h3>
              {creator.platforms.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Keine Plattformen verknüpft.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {creator.platforms.map((p) => {
                    const icon = PLATFORM_ICONS[p];
                    const key = PLATFORM_KEY[p] ?? p.toLowerCase();
                    const isConnected = connectedByKey.has(key);
                    const account = (accountsData?.accounts ?? []).find(
                      (a) =>
                        (a.platform as string) === key &&
                        a.sync_status !== "disconnected",
                    );
                    return (
                      <Card
                        key={p}
                        className="flex-row items-center gap-3 px-4 py-3 bg-muted/30 shadow-none border border-border-light"
                      >
                        <span className="text-lg text-muted-foreground shrink-0">
                          {icon ?? <span className="text-xs font-medium">{p[0]}</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{p}</p>
                          {account?.username && (
                            <p className="text-xs text-muted-foreground truncate">
                              @{account.username}
                            </p>
                          )}
                          {account?.last_sync_at && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              Sync:{" "}
                              {new Date(account.last_sync_at).toLocaleString("de-DE", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                        {isConnected ? (
                          disconnectConfirmId === account!.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-muted-foreground">Wirklich trennen?</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={disconnectMutation.isPending}
                                onClick={() => disconnectMutation.mutate(account!.id)}
                              >
                                {disconnectMutation.isPending
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : "Ja"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={disconnectMutation.isPending}
                                onClick={() => setDisconnectConfirmId(null)}
                              >
                                Nein
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn(
                                "flex items-center gap-1.5 text-xs",
                                account?.sync_status === "error" ? "text-destructive" : "text-success",
                              )}>
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  account?.sync_status === "error" ? "bg-destructive" : "bg-success",
                                )} />
                                {account?.sync_status === "error" ? "Sync-Fehler" : "Verbunden"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={syncMutation.isPending && syncMutation.variables?.accountId === account!.id}
                                onClick={() => syncMutation.mutate({ accountId: account!.id, platform: key })}
                                title="Jetzt synchronisieren"
                              >
                                <RefreshCw className={cn(
                                  "w-3.5 h-3.5",
                                  syncMutation.isPending &&
                                    syncMutation.variables?.accountId === account!.id &&
                                    "animate-spin",
                                )} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-destructive"
                                onClick={() => setDisconnectConfirmId(account!.id)}
                                title="Verbindung trennen"
                              >
                                <Link2Off className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )
                        ) : OAUTH_SUPPORTED.has(key) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-7 text-xs gap-1"
                            disabled={inviteLoading === key}
                            onClick={() => handleCreateInvite(key)}
                          >
                            {inviteLoading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Verbinden
                          </Button>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                            Nicht verbunden
                          </span>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Insights */}
            {hasInsights && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Insights
                </h3>
                <div className="flex flex-col gap-2">
                  {metricsData!.accounts.map((acc) => {
                    const m = metricsData!.metrics[acc.id]?.current;
                    if (!m) return null;
                    const displayName = PLATFORM_LABEL[acc.platform as string] ?? acc.platform;
                    return (
                      <Card
                        key={acc.id}
                        className="flex-row items-center gap-3 px-4 py-3 bg-muted/30 shadow-none border border-border-light"
                      >
                        <span className="text-lg text-muted-foreground shrink-0">
                          {PLATFORM_ICONS[acc.platform as string] ?? (
                            <span className="text-xs font-medium">{String(displayName)[0]}</span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">{displayName}</span>
                          {acc.username && (
                            <span className="text-[10px] text-muted-foreground"> · @{acc.username}</span>
                          )}
                        </div>
                        <div className="flex gap-4 shrink-0 text-right">
                          <div>
                            <div className="text-[10px] text-muted-foreground">Follower</div>
                            <div className="text-sm font-semibold tabular-nums">{fmtNum(m.audience)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">Views/30d</div>
                            <div className="text-sm font-semibold tabular-nums">{fmtNum(m.views_30d)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">ER</div>
                            <div className="text-sm font-semibold tabular-nums">{m.engagement_rate.toFixed(1)}%</div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Invite-URL Dialog */}
      <Dialog open={!!inviteUrl} onOpenChange={(o) => !o && setInviteUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OAuth-Link erstellt</DialogTitle>
            <DialogDescription>
              Teile diesen Link mit dem Creator. Er ist 48 Stunden gültig und startet den Verbindungs-Flow direkt.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5">
            <p className="flex-1 text-xs font-mono truncate text-muted-foreground">{inviteUrl}</p>
            <CopyButton
              value={inviteUrl ?? ""}
              className="shrink-0 p-1 rounded hover:bg-background transition-colors"
            />
          </div>
          {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
          <a
            href={inviteUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Link im Browser öffnen
          </a>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Schließen</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
