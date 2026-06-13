interface PageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function ConnectErrorPage({ searchParams }: PageProps) {
  const { reason } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-sm w-full text-center space-y-4 p-8 rounded-2xl border border-destructive/30 bg-card shadow-sm">
        <div className="text-4xl">✗</div>
        <h1 className="text-xl font-bold">Verbindung fehlgeschlagen</h1>
        <p className="text-sm text-muted-foreground">
          {reason === "access_denied"
            ? "Du hast den Zugriff abgelehnt. Bitte wende dich an deine Agentur, falls du dich umentscheidest."
            : "Beim Verbinden ist ein Fehler aufgetreten. Bitte versuche es erneut oder wende dich an deine Agentur."}
        </p>
        {reason && reason !== "access_denied" && (
          <p className="text-xs text-muted-foreground font-mono break-all">{reason}</p>
        )}
      </div>
    </div>
  );
}
