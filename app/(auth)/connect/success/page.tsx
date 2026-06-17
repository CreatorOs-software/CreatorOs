import { PLATFORM_META } from "@/lib/platforms/registry";
import type { Platform } from "@/lib/platforms/types";

interface PageProps {
  searchParams: Promise<{ platform?: string }>;
}

export default async function ConnectSuccessPage({ searchParams }: PageProps) {
  const { platform } = await searchParams;
  const meta = platform && platform in PLATFORM_META
    ? PLATFORM_META[platform as Platform]
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-sm w-full text-center space-y-4 p-8 rounded-2xl border border-border bg-card shadow-sm">
        <div className="text-4xl">✓</div>
        <h1 className="text-xl font-bold">Verbindung hergestellt</h1>
        <p className="text-sm text-muted-foreground">
          {meta
            ? `Dein ${meta.label}-Konto wurde erfolgreich verbunden. Deine Agentur kann jetzt deine Statistiken abrufen.`
            : "Dein Konto wurde erfolgreich verbunden."}
        </p>
        <p className="text-xs text-muted-foreground">
          Du kannst dieses Fenster jetzt schließen.
        </p>
      </div>
    </div>
  );
}
