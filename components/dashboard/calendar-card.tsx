"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarEvent = {
  id: string;
  title: string;
  type: "shoot" | "travel" | "deadline" | "brand" | "internal" | "posting";
  start_at: string;
  end_at: string;
  location: string | null;
  creator_id: string | null;
  creators: { full_name: string; initials: string; color: string } | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  shoot:    { bg: "bg-yellow-400/15", text: "text-yellow-700", label: "Shoot" },
  travel:   { bg: "bg-blue-500/10",   text: "text-blue-600",   label: "Travel" },
  deadline: { bg: "bg-red-500/10",    text: "text-red-600",    label: "Deadline" },
  posting:  { bg: "bg-orange-500/10", text: "text-orange-600", label: "Posting" },
  brand:    { bg: "bg-purple-500/10", text: "text-purple-600", label: "Brand" },
  internal: { bg: "bg-muted",         text: "text-muted-foreground", label: "Intern" },
};

const DAY_NAMES = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTH_NAMES = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(weekOffset: number): Date[] {
  const now = new Date();
  const monday = new Date(now);
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0
  monday.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarCardProps {
  className?: string;
  creatorId?: string;
}

export function CalendarCard({ className, creatorId }: CalendarCardProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = getWeekDays(weekOffset);
  const from = days[0].toISOString();
  const to = new Date(days[6].getTime() + 86_400_000 - 1).toISOString();

  const { data, isPending } = useQuery<{ events: CalendarEvent[] }>({
    queryKey: [...QueryKeys.events.range(from, to), creatorId ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams({ from, to });
      if (creatorId) params.set("creator_id", creatorId);
      return fetch(`/api/events?${params}`).then((r) => r.json());
    },
    staleTime: 5 * 60_000,
  });

  const events = data?.events ?? [];

  const monthLabel = (() => {
    const months = [...new Set(days.map((d) => d.getMonth()))];
    return months.map((m) => MONTH_NAMES[m]).join(" / ") + " " + days[0].getFullYear();
  })();

  return (
    <Card className={cn("rounded-2xl p-5 gap-0 ring-0 h-full flex flex-col bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-4 gap-0">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setWeekOffset((w) => w - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setWeekOffset((w) => w + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
        {/* Day header row */}
        <div className="grid grid-cols-7 gap-1 shrink-0">
          {days.map((d) => (
            <div key={d.toISOString()} className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {DAY_NAMES[d.getDay()]}
              </p>
              <div
                className={cn(
                  "mx-auto w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mt-0.5",
                  isToday(d) && "bg-yellow-400 text-black",
                )}
              >
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Events grid */}
        <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 overflow-y-auto content-start">
          {days.map((d) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start_at), d));
            return (
              <div key={d.toISOString()} className="flex flex-col gap-1 min-w-0">
                {isPending ? (
                  <div className="h-12 rounded-xl bg-muted/50 animate-pulse" />
                ) : dayEvents.length === 0 ? null : (
                  dayEvents.map((ev) => {
                    const style = TYPE_STYLE[ev.type] ?? TYPE_STYLE.internal;
                    return (
                      <div
                        key={ev.id}
                        className={cn("rounded-xl p-1.5 flex flex-col gap-0.5 min-w-0", style.bg)}
                      >
                        <span className={cn("text-[10px] font-semibold leading-none", style.text)}>
                          {style.label}
                        </span>
                        <p className="text-xs font-medium leading-tight truncate text-foreground">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-none">
                          {formatTime(ev.start_at)}
                        </p>
                        {ev.creators && (
                          <span
                            className="mt-0.5 w-5 h-5 rounded-md inline-flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                            style={{ background: ev.creators.color }}
                            title={ev.creators.full_name}
                          >
                            {ev.creators.initials}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="shrink-0 flex gap-3 flex-wrap pt-2 border-t border-border-light/50">
          {Object.entries(TYPE_STYLE).map(([key, s]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={cn("w-1.5 h-1.5 rounded-full", s.bg.replace("/15", "").replace("/10", ""), "border", s.text.replace("text-", "border-"))} />
              {s.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
