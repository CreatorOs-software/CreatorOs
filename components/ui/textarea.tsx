import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, style, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border-0 px-3 py-2 text-sm outline-none transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/40",
        className,
      )}
      style={{ backgroundColor: "var(--input)", ...style }}
      {...props}
    />
  );
}

export { Textarea };
