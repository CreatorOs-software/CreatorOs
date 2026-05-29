"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProgressCardProps {
  className?: string;
}

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
const progressData = [
  { day: "S", values: [30, 40], hasYellow: false },
  { day: "M", values: [50, 60, 45], hasYellow: false },
  { day: "T", values: [70, 80], hasYellow: false },
  { day: "W", values: [40, 55], hasYellow: false },
  { day: "T", values: [85, 75, 90], hasYellow: true, label: "8k" },
  { day: "F", values: [60, 70], hasYellow: false },
  { day: "S", values: [20, 25], hasYellow: false },
];

export function ProgressCard({ className }: ProgressCardProps) {
  return (
    <Card className={cn("rounded-2xl p-5 gap-0 ring-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-4 gap-0">
        <CardTitle className="text-lg font-semibold text-foreground">
          Progress
        </CardTitle>
        <Button variant="outline" size="icon-sm">
          <ArrowUpRight />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-light tracking-tight">6.1</span>
          <span className="text-4xl font-light">h</span>
          <div className="ml-2">
            <p className="text-xs text-muted-foreground">Work Time</p>
            <p className="text-xs text-muted-foreground">this week</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-2 h-32">
          {progressData.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 flex-1">
              <div className="relative flex flex-col items-center gap-1 h-24 justify-end">
                {item.hasYellow && item.label && (
                  <div className="absolute -top-6 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                    {item.label}
                  </div>
                )}
                {item.values.map((val, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 rounded-full",
                      item.hasYellow && i === item.values.length - 1
                        ? "bg-primary"
                        : "bg-secondary",
                    )}
                    style={{ height: `${val}%` }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground mt-2">
                {weekDays[idx]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
