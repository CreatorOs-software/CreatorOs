"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@talentos/ui";
import { Home, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

const supportEmail = process.env.NEXT_PUBLIC_ERROR_REPORT_EMAIL ?? "";

export function ErrorFallback({ error, unstable_retry }: ErrorFallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const reportError = () => {
    const reference = error.digest ? `\nFehler-ID: ${error.digest}` : "";
    const body = [
      "Hallo Prodigy One Team,",
      "",
      "in der App ist ein Fehler aufgetreten.",
      reference,
      `Seite: ${window.location.href}`,
      `Zeitpunkt: ${new Date().toLocaleString("de-DE")}`,
      `Fehler: ${error.message || "Keine Fehlermeldung verfügbar"}`,
      "",
      "Was ist unmittelbar davor passiert?",
      "",
    ].join("\n");

    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(
      "Fehler in TalentOS",
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,var(--color-primary)_0,transparent_32%)] opacity-20"
      />
      <section className="relative w-full max-w-lg rounded-[2rem] border border-border/70 bg-card/95 p-8 shadow-2xl shadow-black/10 backdrop-blur sm:p-12">
        <Image
          src="/logos/svg/prodigy-one-logo-primary.svg"
          alt="Prodigy One"
          width={148}
          height={40}
          priority
          className="mb-12 h-8 w-auto"
        />

        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert aria-hidden="true" className="size-7" strokeWidth={1.8} />
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Unerwarteter Fehler
        </p>
        <h1 className="text-balance text-3xl font-black tracking-tight sm:text-4xl">
          Das hätte nicht passieren sollen.
        </h1>
        <p className="mt-4 max-w-md text-pretty text-base leading-7 text-muted-foreground">
          Die Anwendung ist an dieser Stelle ins Stolpern geraten. Du kannst den Fehler direkt an uns schicken oder zur Startseite zurückkehren.
        </p>

        {error.digest ? (
          <p className="mt-6 font-mono text-xs text-muted-foreground">
            Fehler-ID: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button type="button" size="lg" onClick={reportError} className="gap-2">
            <Send aria-hidden="true" className="size-4" />
            Fehler melden
          </Button>
          <Button type="button" size="lg" variant="outline" asChild>
            <Link href="/dashboard" className="gap-2">
              <Home aria-hidden="true" className="size-4" />
              Zur Startseite
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={unstable_retry}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Noch einmal versuchen
        </button>
      </section>
    </main>
  );
}
