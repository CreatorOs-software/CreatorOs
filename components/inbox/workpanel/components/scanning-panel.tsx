import { Loader2 } from "lucide-react";

export function ScanningPanel() {
  return (
    <div className="flex flex-col items-center gap-3 pt-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      <p className="text-sm text-muted-foreground">
        Liest Brand, Format, Budget und Creator aus…
      </p>
    </div>
  );
}
