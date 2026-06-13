"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = {
  id: number;
  label: string;
};

interface StepperProps {
  steps: Step[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-start w-full">
      {steps.map((step, i) => {
        const state =
          step.id < current ? "done" : step.id === current ? "active" : "future";
        const isLast = i === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn("flex items-start", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  state === "done" && "bg-yellow-400 text-black",
                  state === "active" && "bg-foreground text-background ring-4 ring-foreground/10",
                  state === "future" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  state === "active" && "text-foreground",
                  state !== "active" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div className="flex-1 h-[1px] mt-3.5 mx-2 bg-border-light overflow-hidden">
                <div
                  className={cn(
                    "h-full bg-yellow-400 transition-all duration-300",
                    state === "done" ? "w-full" : "w-0",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
