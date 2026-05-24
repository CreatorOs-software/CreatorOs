"use client";

import { cn } from "@/lib/utils";
import {
  Monitor,
  Zap,
  MessageCircle,
  CalendarCheck,
  Link,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface OnboardingTaskCardProps {
  className?: string;
}

const tasks = [
  { icon: Monitor, title: "Interview", date: "Sep 13, 08:30", completed: true },
  { icon: Zap, title: "Team Meeting", date: "Sep 13, 10:30", completed: true },
  {
    icon: MessageCircle,
    title: "Project Update",
    date: "Sep 13, 13:00",
    completed: false,
  },
  {
    icon: CalendarCheck,
    title: "Discuss Q3 Goals",
    date: "Sep 13, 14:45",
    completed: false,
  },
  {
    icon: Link,
    title: "HR Policy Review",
    date: "Sep 13, 16:30",
    completed: false,
  },
];

export function OnboardingTaskCard({ className }: OnboardingTaskCardProps) {
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length + 3;

  return (
    <Card
      className={cn(
        "rounded-2xl p-5 gap-0 bg-card-dark text-card-dark-foreground ",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between p-0 mb-6 gap-0">
        <CardTitle className="text-lg font-semibold text-card-dark-foreground">
          Onboarding Task
        </CardTitle>
        <span className="text-2xl font-light">
          {completedCount}/{totalCount}
        </span>
      </CardHeader>

      <CardContent className="p-0">
        <div className="space-y-3">
          {tasks.map((task, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                <task.icon className="w-5 h-5 text-card-dark-foreground/70" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-card-dark-foreground/60">
                  {task.date}
                </p>
              </div>
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  task.completed
                    ? "bg-chart-green text-white"
                    : "bg-card-dark-foreground/20",
                )}
              >
                {task.completed && <CheckCircle2 className="w-4 h-4" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
