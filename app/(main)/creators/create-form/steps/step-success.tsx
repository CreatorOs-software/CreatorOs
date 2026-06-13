import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepSuccessProps {
  onReset: () => void;
  onGoBack: () => void;
}

export function StepSuccess({ onReset, onGoBack }: StepSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center">
        <Check className="w-7 h-7 text-black" />
      </div>
      <div>
        <p className="text-base font-semibold">Creator wurde angelegt!</p>
        <p className="text-xs text-muted-foreground mt-1">
          Das Profil ist jetzt aktiv und kann bearbeitet werden.
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="outline" onClick={onGoBack}>
          Zur Übersicht
        </Button>
        <Button
          onClick={onReset}
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          + Weiteren Creator anlegen
        </Button>
      </div>
    </div>
  );
}
