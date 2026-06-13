"use client";

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

// Arrow notch size in px — both left indent and right protrusion
const NOTCH = 16;

// Clip-path polygon for each position variant.
//
// Left notch (steps 2+): outer corners sit at x=0, the inward tip at x=NOTCH y=50%.
//   Path traces: … (0,100%) → (NOTCH,50%) → (0,0) …
//   The "V" points RIGHT into the step = Einkerbung.
//
// Right arrow: base at x=100%-NOTCH, tip at x=100% y=50%.
function chevronPath(isFirst: boolean, isLast: boolean): string {
  // First: flat left + arrow right
  if (isFirst)
    return `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`;
  // Last: inward notch left + flat right
  if (isLast) return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${NOTCH}px 50%)`;
  // Middle: inward notch left + arrow right
  return `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
}

export function Stepper({ steps, current }: StepperProps) {
  const total = steps.length;

  return (
    <div className="flex items-stretch w-full h-[52px]">
      {steps.map((step, i) => {
        const isFirst = i === 0;
        const isLast = i === total - 1;
        const state: "done" | "active" | "future" =
          step.id < current
            ? "done"
            : step.id === current
              ? "active"
              : "future";

        const clip = chevronPath(isFirst, isLast);

        // Padding pushes text away from notch/arrow areas so centering is accurate
        const pl = isFirst ? 12 : NOTCH + 12;
        const pr = isLast ? 12 : NOTCH + 12;

        return (
          <div
            key={step.id}
            className="relative flex-1"
            style={{
              // Overlap: each step (except the first) slides left by NOTCH px
              // so the previous step's arrow fills the next step's notch

              // Done steps render on top — their arrow covers the next step's notch indent
              zIndex: total - i,
            }}
          >
            {/* ── Active border layer ──────────────────────────────────────
                clip-path doesn't support outline/border. Instead, we place a
                fully-coloured layer behind the fill, then inset the fill by
                BORDER px — the colour "peeks through" as a consistent border. */}
            {state === "active" && (
              <div
                className="absolute inset-0 bg-yellow-400"
                style={{ clipPath: clip }}
              />
            )}

            {/* ── Fill layer ──────────────────────────────────────────────── */}
            <div
              className={cn(
                "absolute flex flex-col items-center justify-center",
                state === "done" && "bg-foreground",
                state === "active" && "bg-card",
                state === "future" && "bg-muted",
              )}
              style={{
                clipPath: clip,
                // Inset creates the border gap (only needed for active)
                inset: state === "active" ? "2px" : 0,
                paddingLeft: `${pl}px`,
                paddingRight: `${pr}px`,
              }}
            >
              <span
                className={cn(
                  "text-sm font-semibold leading-tight text-center w-full truncate",
                  state === "done" && "text-background",
                  state === "active" && "text-yellow-400",
                  state === "future" && "text-foreground/50",
                )}
              >
                {step.label}
              </span>

              {step.sub && (
                <span
                  className={cn(
                    "text-[11px] leading-tight text-center w-full truncate",
                    state === "done" && "text-background/60",
                    state === "active" && "text-muted-foreground",
                    state === "future" && "text-muted-foreground/60",
                  )}
                >
                  {step.sub}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
