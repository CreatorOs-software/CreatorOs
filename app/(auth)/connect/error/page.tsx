interface PageProps {
  searchParams: Promise<{ reason?: string }>;
}

const REASON_MAP: Record<string, string> = {
  access_denied:
    "Du hast den Zugriff abgelehnt. Wende dich an deine Agentur, falls du dich umentscheidest.",
  "Invalid or expired invite token":
    "Der Einladungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.",
  "Platform mismatch between token and callback":
    "Plattform-Konflikt – bitte fordere einen neuen Einladungslink an.",
  invalid_callback:
    "Ungültige Callback-Parameter. Bitte versuche es erneut.",
};

export default async function ConnectErrorPage({ searchParams }: PageProps) {
  const { reason } = await searchParams;

  const friendlyMessage =
    (reason && REASON_MAP[reason]) ??
    "Beim Verbinden ist ein Fehler aufgetreten. Bitte versuche es erneut oder wende dich an deine Agentur.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-sm w-full text-center space-y-4 p-8 rounded-2xl border border-destructive/30 bg-card shadow-sm">
        <div className="text-4xl">✗</div>
        <h1 className="text-xl font-bold">Verbindung fehlgeschlagen</h1>
        <p className="text-sm text-muted-foreground">{friendlyMessage}</p>
        {reason && !REASON_MAP[reason] && (
          <p className="text-xs text-muted-foreground/60 font-mono break-all">
            {reason}
          </p>
        )}
      </div>
    </div>
  );
}
