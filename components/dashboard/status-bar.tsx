"use client";

import { cn } from "@/lib/utils";

interface StatusBarProps {
  label: string;
  value: string;
  variant?: "dark" | "yellow" | "striped" | "light";
  className?: string;
}

export function StatusBar({
  label,
  value,
  variant = "light",
  className,
}: StatusBarProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-medium min-w-[60px]",
          variant === "dark" && "bg-secondary text-secondary-foreground",
          variant === "yellow" && "bg-primary text-primary-foreground",
          variant === "striped" &&
            "bg-muted text-muted-foreground relative overflow-hidden",
          variant === "light" &&
            "bg-card text-card-foreground border border-border",
        )}
      >
        {variant === "striped" ? (
          <div className="relative z-10">{value}</div>
        ) : (
          value
        )}
        {variant === "striped" && (
          <div className="absolute inset-0 flex">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="h-full w-1.5 bg-border-light mr-0.75"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatusBarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function StatusBarGroup({ children, className }: StatusBarGroupProps) {
  return (
    <div className={cn("flex items-end gap-2", className)}>{children}</div>
  );
}
