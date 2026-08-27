import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onAnalyse: () => void;
  onNotCoop: () => void;
  onManualCreate: () => void;
};

export function IdlePanel({ onAnalyse, onNotCoop, onManualCreate }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 pt-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
        <Sparkles className="h-6 w-6 text-brand" />
      </div>

      <div>
        <p className="text-sm font-semibold">Noch nicht analysiert</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Die KI liest diese Mail erst, wenn du es sagst.
        </p>
      </div>

      <Button className={"w-full"} onClick={onAnalyse}>
        Als Kooperationsanfrage lesen
      </Button>

      <Button className="w-full" variant={"secondary"} onClick={onManualCreate}>
        Anfrage anlegen
      </Button>

      <div className="flex w-full flex-col gap-2">
        <Button variant="outline" className="w-full">
          Zu bestehendem Vorgang zuordnen
        </Button>
        <Button variant="outline" className="w-full" onClick={onNotCoop}>
          Keine Anfrage – nicht scannen
        </Button>
      </div>

      <p className="rounded-xl bg-muted px-3 py-2.5 text-left text-xs leading-relaxed text-muted-foreground">
        Würde jede Mail automatisch gescannt, zahlst du auch für Newsletter,
        Spam und interne Mails.{" "}
        <span className="font-medium text-foreground">
          So läuft die KI nur da, wo sie etwas wert ist.
        </span>
      </p>
    </div>
  );
}
