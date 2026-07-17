"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_META, isSupported } from "@/lib/platforms/registry";

// Platforms that support OAuth invite links (derived from PLATFORM_META)
function oauthLabel(platform: string): string | null {
  const key = platform.toLowerCase();
  if (!isSupported(key)) return null;
  return PLATFORM_META[key as keyof typeof PLATFORM_META]?.oauthSupported
    ? PLATFORM_META[key as keyof typeof PLATFORM_META].label
    : null;
}

interface InviteCardProps {
  creatorId: string;
  platform: string;
  platformLabel: string;
}

function InviteCard({ creatorId, platform, platformLabel }: InviteCardProps) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLink() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator_id: creatorId, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setInviteUrl(data.invite_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border-light bg-input px-4 py-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{platformLabel}</span>

        {!inviteUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={createLink}
            disabled={loading}
            className="h-7 text-xs px-3"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              "Link erstellen"
            )}
          </Button>
        )}
      </div>

      {inviteUrl && (
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate text-xs bg-background rounded-lg px-3 py-1.5 border border-border-light text-muted-foreground font-mono">
            {inviteUrl}
          </code>
          <button
            onClick={copyLink}
            className="shrink-0 p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
            title="Kopieren"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1.5 rounded-md hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
            title="Link öffnen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface StepSuccessProps {
  creatorId: string | null;
  platforms: string[];
  onReset: () => void;
  onGoBack: () => void;
}

export function StepSuccess({ creatorId, platforms, onReset, onGoBack }: StepSuccessProps) {
  const oauthPlatforms = platforms
    .map((p) => ({ key: p.toLowerCase(), label: oauthLabel(p), display: p }))
    .filter((p): p is { key: string; label: string; display: string } => p.label !== null);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Success header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-7 h-7 text-black" />
        </div>
        <div>
          <p className="text-base font-semibold">Creator wurde angelegt!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Das Profil ist jetzt aktiv und kann bearbeitet werden.
          </p>
        </div>
      </div>

      {/* Invite links section */}
      {creatorId && oauthPlatforms.length > 0 && (
        <div className="w-full flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold">Plattform verbinden</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Erstelle einen Einladungslink und schicke ihn dem Creator.
              Er verbindet sein Konto direkt, ohne einen Account bei euch zu benötigen.
            </p>
          </div>
          {oauthPlatforms.map((p) => (
            <InviteCard
              key={p.key}
              creatorId={creatorId}
              platform={p.key}
              platformLabel={p.label}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        <Button variant="outline" onClick={onGoBack}>
          Zur Übersicht
        </Button>
        <Button
          onClick={onReset}
          className="bg-primary text-primary-foreground hover:bg-primary/80"
        >
          + Weiteren Creator anlegen
        </Button>
      </div>
    </div>
  );
}
