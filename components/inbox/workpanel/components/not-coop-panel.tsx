import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotCoopPanel() {
  return (
    <div className="flex flex-col items-center gap-4 pt-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">Keine Kooperationsanfrage</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Diese Mail wird nicht weiter beobachtet.
        </p>
      </div>
      <Button variant="outline" className="w-full">
        Zu Vorgang zuordnen
      </Button>
    </div>
  );
}
