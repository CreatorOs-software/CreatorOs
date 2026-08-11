"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DatePickerSingleProps {
  range?: false;
  value?: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showEventToggle?: boolean;
  onCreateEvent?: () => void;
}

interface DatePickerRangeProps {
  range: true;
  startValue?: string | null;
  endValue?: string | null;
  onChangeStart: (date: string | null) => void;
  onChangeEnd: (date: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showEventToggle?: boolean;
  onCreateEvent?: () => void;
}

type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtLong(d: Date | null): string {
  if (!d) return "";
  return format(d, "d. MMMM yyyy", { locale: de });
}

function fmtShort(d: Date | null): string {
  if (!d) return "";
  return format(d, "dd.MM.yyyy");
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// ── Calendar ───────────────────────────────────────────────────────────────────

interface CalendarProps {
  month: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  startDate: Date | null;
  endDate: Date | null;
  onDayClick: (d: Date) => void;
  range: boolean;
}

function Calendar({
  month,
  onPrevMonth,
  onNextMonth,
  startDate,
  endDate,
  onDayClick,
  range,
}: CalendarProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  return (
    <div className="w-56 shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPrevMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <AnimatePresence mode="wait">
          <motion.span
            key={format(month, "MM-yyyy")}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-semibold"
          >
            {format(month, "MMMM yyyy", { locale: de })}
          </motion.span>
        </AnimatePresence>
        <button
          type="button"
          onClick={onNextMonth}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, month);
          const isStart = startDate ? isSameDay(day, startDate) : false;
          const isEnd = endDate ? isSameDay(day, endDate) : false;
          const isToday = isSameDay(day, new Date());
          const inRange =
            range &&
            startDate &&
            endDate &&
            isAfter(day, startDate) &&
            isBefore(day, endDate);

          return (
            <div
              key={day.toString()}
              className="relative h-9 flex items-center justify-center"
            >
              {/* Range strip */}
              {inRange && (
                <div className="absolute inset-y-1 inset-x-0 bg-primary/15" />
              )}
              {isStart && endDate && (
                <div className="absolute inset-y-1 left-1/2 right-0 bg-primary/15" />
              )}
              {isEnd && startDate && (
                <div className="absolute inset-y-1 left-0 right-1/2 bg-primary/15" />
              )}

              <motion.button
                type="button"
                onClick={() => onDayClick(day)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "relative z-10 size-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                  !isCurrentMonth && "text-muted-foreground/30",
                  isCurrentMonth && !isStart && !isEnd && "hover:bg-muted",
                  isToday && !isStart && !isEnd && "text-primary font-bold",
                  (isStart || isEnd) &&
                    "bg-primary text-primary-foreground font-semibold",
                  inRange && "text-foreground",
                )}
              >
                {format(day, "d")}
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Date display box ───────────────────────────────────────────────────────────

function DateBox({
  label,
  date,
}: {
  label: string;
  date: Date | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-1.5">{label}</p>
      <div
        className={cn(
          "flex items-center px-3 py-2.5 rounded-lg border bg-background transition-colors",
          date ? "border-border" : "border-border/50",
        )}
      >
        <span
          className={cn(
            "text-sm flex-1",
            date ? "text-foreground" : "text-muted-foreground/50",
          )}
        >
          {date ? fmtLong(date) : "Datum auswählen"}
        </span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DatePicker(props: DatePickerProps) {
  const isRange = props.range === true;

  const committedStart = isRange
    ? parseDate((props as DatePickerRangeProps).startValue)
    : parseDate((props as DatePickerSingleProps).value);
  const committedEnd = isRange
    ? parseDate((props as DatePickerRangeProps).endValue)
    : null;

  const showEventToggle = props.showEventToggle ?? false;

  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [month, setMonth] = useState(startOfMonth(committedStart ?? new Date()));
  const [createEvent, setCreateEvent] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  // Reset draft to committed values each time picker opens
  useEffect(() => {
    if (open) {
      setDraftStart(committedStart);
      setDraftEnd(committedEnd);
      setMonth(startOfMonth(committedStart ?? new Date()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleDayClick(day: Date) {
    if (!isRange) {
      setDraftStart(day);
      return;
    }
    // Range: no start, or both set → new start
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(day);
      setDraftEnd(null);
    } else if (isBefore(day, draftStart)) {
      setDraftStart(day);
    } else {
      setDraftEnd(day);
    }
  }

  function handleConfirm() {
    if (!isRange) {
      (props as DatePickerSingleProps).onChange(
        draftStart ? toISO(draftStart) : null,
      );
    } else {
      const rProps = props as DatePickerRangeProps;
      rProps.onChangeStart(draftStart ? toISO(draftStart) : null);
      rProps.onChangeEnd(draftEnd ? toISO(draftEnd) : null);
    }
    if (createEvent) props.onCreateEvent?.();
    setOpen(false);
  }

  function handleClearTrigger(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isRange) {
      (props as DatePickerSingleProps).onChange(null);
    } else {
      const rProps = props as DatePickerRangeProps;
      rProps.onChangeStart(null);
      rProps.onChangeEnd(null);
    }
  }

  const hasValue = isRange
    ? !!(committedStart || committedEnd)
    : !!committedStart;

  const triggerLabel = (() => {
    if (!isRange)
      return committedStart
        ? fmtShort(committedStart)
        : (props.placeholder ?? "Datum wählen");
    if (!committedStart && !committedEnd)
      return props.placeholder ?? "Zeitraum wählen";
    if (committedStart && !committedEnd)
      return `${fmtShort(committedStart)} – …`;
    return `${fmtShort(committedStart)} – ${fmtShort(committedEnd)}`;
  })();

  const summaryText = (() => {
    if (!isRange)
      return draftStart ? `Ausgewählt: ${fmtLong(draftStart)}` : "Wähle ein Datum aus.";
    if (!draftStart) return "Wähle zuerst ein Startdatum.";
    if (!draftEnd)
      return `Start: ${fmtShort(draftStart)} — jetzt Enddatum wählen.`;
    return `Zeitraum: ${fmtShort(draftStart)} – ${fmtShort(draftEnd)}`;
  })();

  const confirmDisabled = isRange
    ? !draftStart || !draftEnd
    : !draftStart;

  return (
    <div ref={ref} className={cn("relative", props.className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm transition-colors",
          "hover:border-border/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          hasValue ? "text-foreground" : "text-muted-foreground",
          props.disabled && "opacity-50 cursor-not-allowed",
          open && "border-ring ring-1 ring-ring",
        )}
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left truncate">{triggerLabel}</span>
        {hasValue && !props.disabled && (
          <span
            role="button"
            onClick={handleClearTrigger}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3" />
          </span>
        )}
      </button>

      {/* Two-panel picker */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute z-50 mt-1 p-5 bg-card border border-border rounded-2xl shadow-xl flex gap-6"
          >
            {/* Left: Calendar */}
            <Calendar
              month={month}
              onPrevMonth={() => setMonth(subMonths(month, 1))}
              onNextMonth={() => setMonth(addMonths(month, 1))}
              startDate={draftStart}
              endDate={draftEnd}
              onDayClick={handleDayClick}
              range={isRange}
            />

            {/* Divider */}
            <div className="w-px bg-border-light self-stretch" />

            {/* Right: Info + actions */}
            <div className="flex flex-col justify-between w-44 gap-4">
              <div className="flex flex-col gap-3">
                {isRange ? (
                  <>
                    <DateBox label="Startdatum *" date={draftStart} />
                    <DateBox label="Enddatum *" date={draftEnd} />
                  </>
                ) : (
                  <DateBox label="Datum *" date={draftStart} />
                )}
              </div>

              <div className="pt-3 border-t border-border-light">
                <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
                  {summaryText}
                </p>
                {showEventToggle && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-foreground">
                      Als Termin anlegen
                    </span>
                    <Switch
                      checked={createEvent}
                      onCheckedChange={setCreateEvent}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirmDisabled}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Bestätigen
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
