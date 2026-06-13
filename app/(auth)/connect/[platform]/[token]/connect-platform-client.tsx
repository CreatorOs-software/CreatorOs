"use client";

import { Button } from "@/components/ui/button";

interface Props {
  platform: string;
  platformLabel: string;
  platformColor: string;
  authUrl: string;
  expiresAt: string;
}

export function ConnectPlatformClient({
  platformLabel,
  platformColor,
  authUrl,
  expiresAt,
}: Props) {
  const expiryDate = new Date(expiresAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-sm w-full space-y-6 p-8 rounded-2xl border border-border bg-card shadow-sm">
        {/* Platform indicator */}
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full shrink-0"
            style={{ background: platformColor }}
          />
          <span className="text-sm font-medium">{platformLabel}</span>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold">
            {platformLabel} verbinden
          </h1>
          <p className="text-sm text-muted-foreground">
            Deine Agentur möchte dein {platformLabel}-Konto verknüpfen,
            um Reichweite und Statistiken zu analysieren.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-foreground">✓</span>
            Nur Lesezugriff auf öffentliche Statistiken
          </li>
          <li className="flex gap-2">
            <span className="text-foreground">✓</span>
            Keine Änderungen an deinem Konto
          </li>
          <li className="flex gap-2">
            <span className="text-foreground">✓</span>
            Jederzeit widerrufbar
          </li>
        </ul>

        <a
          href={authUrl}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 py-2 shadow hover:bg-primary/90 transition-colors"
        >
          Mit {platformLabel} verbinden
        </a>

        <p className="text-xs text-muted-foreground text-center">
          Dieser Link ist gültig bis {expiryDate}
        </p>
      </div>
    </div>
  );
}
