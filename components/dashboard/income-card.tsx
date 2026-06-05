"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface IncomeCardProps {
  title?: string;
  data?: { day: string; income: number }[];
  className?: string;
}

const DEFAULT_DATA = [
  { day: "So", income: 800 },
  { day: "Mo", income: 3200 },
  { day: "Di", income: 1500 },
  { day: "Mi", income: 4800 },
  { day: "Do", income: 6100 },
  { day: "Fr", income: 2900 },
  { day: "Sa", income: 1100 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function IncomeCard({
  title = "Income",
  data = DEFAULT_DATA,
  className,
}: IncomeCardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const maxIncome = Math.max(...data.map((d) => d.income));
  const totalIncome = data.reduce((s, d) => s + d.income, 0);
  const selected = selectedIdx !== null ? data[selectedIdx] : null;

  function handleClick(idx: number) {
    setSelectedIdx((prev) => (prev === idx ? null : idx));
  }

  return (
    <Card className={cn("rounded-2xl p-5 gap-0 ring-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-4 gap-0">
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
        <Button variant="outline" size="icon-sm">
          <ArrowUpRight />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {/* Header value */}
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-light tracking-tight">
            ${fmt(totalIncome)}
          </span>
          <div className="ml-1">
            <p className="text-xs text-muted-foreground">{"Diese Woche"}</p>
            <p className="text-xs text-muted-foreground">Umsatz</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end justify-between gap-1 h-32">
          {data.map((item, idx) => {
            const isSelected = selectedIdx === idx;
            const heightPct =
              maxIncome > 0 ? (item.income / maxIncome) * 100 : 0;

            return (
              <div
                key={idx}
                className="flex flex-col items-center gap-0 flex-1 cursor-pointer group"
                onClick={() => handleClick(idx)}
              >
                {/* Bar + tooltip area */}
                <div className="relative flex items-end justify-center w-full h-24">
                  {isSelected && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap z-10">
                      ${fmt(item.income)}
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-full transition-all duration-200 w-full max-w-2.5",
                      isSelected
                        ? "bg-primary"
                        : "bg-secondary group-hover:bg-secondary/60",
                    )}
                    style={{ height: `${Math.max(heightPct, 6)}%` }}
                  />
                </div>

                {/* Day label */}
                <span
                  className={cn(
                    "text-[10px] mt-1.5 transition-colors",
                    isSelected
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
