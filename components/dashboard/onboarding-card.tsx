"use client";

import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OnboardingCardProps {
  className?: string;
}

export function OnboardingCard({ className }: OnboardingCardProps) {
  return (
    <Card className={cn("rounded-2xl p-5 gap-0 ring-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between p-0 mb-4 gap-0">
        <CardTitle className="text-lg font-semibold text-foreground">
          Onboarding
        </CardTitle>
        <span className="text-2xl font-light">18%</span>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
          <span>30%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        <div className="flex gap-1 h-8 mb-3">
          <div className="flex-3 bg-primary rounded-lg" />
          <div className="flex-[2.5] bg-muted rounded-lg" />
          <div className="flex-[4.5] bg-border rounded-lg" />
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="default"
            className="rounded-lg px-4 py-2 h-auto text-sm font-medium"
          >
            Task
          </Badge>
          <div className="flex gap-1">
            <div className="w-8 h-8 rounded-lg bg-muted-foreground/40" />
            <div className="w-8 h-8 rounded-lg bg-muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
