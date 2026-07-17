"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = {
  id: number;
  label: string;
  sub?: string;
};

interface StepperProps {
  steps: Step[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  const total = steps.length;

  // Each step takes (1/total) of the full width.
  // Circle is centered in its step → center of step i is at (i + 0.5) / total.
  // Track runs from center of first circle to center of last circle.
  const offsetPct = 100 / (2 * total); // left/right inset = half a step width
  const fillPct = ((current - 1) / total) * 100; // grows one step-width per completed step

  return (
    <div className="relative flex items-start w-full">
      {/* Gray background track */}
      <div
        className="absolute h-px bg-border-light"
        style={{ top: 16, left: `${offsetPct}%`, right: `${offsetPct}%` }}
      />

      {/* Colored fill — animates width left → right */}
      <div
        className="absolute h-px bg-success transition-all duration-700 ease-in-out"
        style={{ top: 16, left: `${offsetPct}%`, width: `${fillPct}%` }}
      />

      {steps.map((step) => {
        const state: "done" | "active" | "future" =
          step.id < current
            ? "done"
            : step.id === current
              ? "active"
              : "future";

        return (
          <div
            key={step.id}
            className="relative z-10 flex-1 flex flex-col items-center"
          >
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors duration-500",
                state === "done" && "bg-success text-success-foreground",
                state === "active" && "bg-primary text-black",
                state === "future" && "bg-muted text-muted-foreground",
              )}
            >
              {state === "done" ? (
                <Check className="w-4 h-4" strokeWidth={2.5} />
              ) : (
                step.id
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "mt-2 text-xs font-medium text-center leading-tight transition-colors duration-300",
                state === "active" && "text-primary",
                state === "done" && "text-foreground",
                state === "future" && "text-muted-foreground/60",
              )}
            >
              {step.label}
            </span>

            {/* Decorative bars */}
            <div className="mt-1.5 flex gap-1">
              <div className="h-0.5 w-5 rounded-full bg-border-light" />
              <div className="h-0.5 w-5 rounded-full bg-border-light" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
