"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CalendarCardProps {
  className?: string;
}

const calendarDays = [
  { day: "Mon", date: 22 },
  { day: "Tue", date: 23 },
  { day: "Wed", date: 24 },
  { day: "Thu", date: 25 },
  { day: "Fri", date: 26 },
  { day: "Sat", date: 27 },
];

const timeSlots = ["8:00 am", "9:00 am", "10:00 am", "11:00 am"];

const events = [
  {
    title: "Weekly Team Sync",
    description: "Discuss progress on projects",
    time: "8:00 am",
    day: "Tue",
    color: "bg-primary",
    avatars: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
    ],
  },
  {
    title: "Onboarding Session",
    description: "Introduction for new hires",
    time: "10:00 am",
    day: "Wed",
    color: "bg-card",
    avatars: [
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
    ],
  },
];

export function CalendarCard({ className }: CalendarCardProps) {
  return (
    <Card className={cn("rounded-2xl p-5 gap-0 ring-0 h-full flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-6 gap-0">
        <Button
          variant="ghost"
          className="rounded-full px-4 h-auto py-1.5 bg-muted hover:bg-muted/80 text-sm font-medium"
        >
          August
        </Button>
        <CardTitle className="text-lg font-semibold">September 2024</CardTitle>
        <Button
          variant="ghost"
          className="rounded-full px-4 h-auto py-1.5 bg-muted hover:bg-muted/80 text-sm font-medium"
        >
          October
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-7 gap-2">
          <div />
          {calendarDays.map((item) => (
            <div key={item.day + item.date} className="text-center">
              <p className="text-sm text-muted-foreground">{item.day}</p>
              <p className="text-lg font-medium">{item.date}</p>
            </div>
          ))}

          {timeSlots.map((time) => (
            <div key={time} className="contents">
              <div className="text-xs text-muted-foreground py-4">{time}</div>
              {calendarDays.map((day) => {
                const event = events.find(
                  (e) => e.time === time && e.day === day.day,
                );
                return (
                  <div
                    key={`${time}-${day.day}`}
                    className="relative border-l border-dashed border-border-light py-2 pl-2"
                  >
                    {event && (
                      <div
                        className={cn(
                          "rounded-xl p-3 h-full",
                          event.color,
                          event.color === "bg-card" && "border border-border",
                        )}
                      >
                        <p className="text-sm font-medium leading-tight">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                        <div className="flex -space-x-2 mt-2">
                          {event.avatars.map((avatar, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full border-2 border-card overflow-hidden relative"
                            >
                              <Image
                                src={avatar}
                                alt="Avatar"
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
