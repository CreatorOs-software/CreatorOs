import * as React from "react";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  style,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-sm border-0 px-3 py-2 text-sm outline-none transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/40",
        className,
      )}
      style={{ backgroundColor: "var(--input)", ...style }}
      {...props}
    />
  );
}

export { Input };
