"use client";

import { Button } from "@talentos/ui";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  label: React.ReactNode;
  value: T;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-input bg-muted p-0.5 text-xs",
        className,
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-auto px-2.5 py-1 rounded-md cursor-pointer text-xs font-normal hover:bg-transparent",
            value === option.value
              ? "bg-card text-foreground font-medium shadow-md"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
