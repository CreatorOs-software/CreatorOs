import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepNavProps {
  onPrev?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  saving?: boolean;
  nextDisabled?: boolean;
  submitLabel?: string;
}

export function StepNav({
  onPrev,
  onNext,
  onSubmit,
  saving,
  nextDisabled,
  submitLabel = "Creator anlegen",
}: StepNavProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-border-light mt-8">
      {onPrev ? (
        <Button type="button" variant="ghost" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
      ) : (
        <div />
      )}

      {onNext && (
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          size={"xl"}
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          Weiter
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}

      {onSubmit && (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          {saving ? "Speichern…" : submitLabel}
        </Button>
      )}
    </div>
  );
}
