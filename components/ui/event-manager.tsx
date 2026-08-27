"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { QueryKeys } from "@/lib/query-keys"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  CalendarCheck,
  Clock,
  Grid3x3,
  List,
  Search,
  X,
  MapPin,
  Users,
  User,
  ChevronsUpDown,
  PenLine,
  Repeat,
  Tag,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Creator } from "@/domains/creators"

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "shoot" | "travel" | "deadline" | "brand" | "internal" | "posting"
type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly"

type TeamMember = { id: string; display_name: string | null; initials: string | null; color: string | null; role: string }

type DbEvent = {
  id: string
  title: string
  notes: string | null
  start_at: string
  end_at: string | null
  type: EventType
  location: string | null
  creator_id: string | null
  attendee_ids: string[]
  all_day: boolean
  recurrence: string
  creators: { full_name: string; initials: string } | null
}

type CalEvent = {
  id: string
  title: string
  notes: string | null
  startTime: Date
  endTime: Date
  type: EventType
  location: string | null
  creatorId: string | null
  attendeeIds: string[]
  allDay: boolean
  recurrence: Recurrence
  creator: { full_name: string; initials: string } | null
}

type FormState = {
  title: string
  notes: string
  start_date: string   // "YYYY-MM-DD"
  start_time: string   // "HH:mm"
  end_date: string     // "YYYY-MM-DD"
  end_time: string     // "HH:mm"
  type: EventType
  location: string
  creator_id: string
  attendee_ids: string[]
  all_day: boolean
  recurrence: Recurrence
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<EventType, { label: string; bg: string; border: string; dot: string; pill: string }> = {
  shoot:    { label: "Shoot",    bg: "bg-purple-500", border: "border-l-purple-500", dot: "bg-purple-500", pill: "bg-purple-100 text-purple-700 border-purple-200" },
  travel:   { label: "Reise",   bg: "bg-blue-500",   border: "border-l-blue-500",   dot: "bg-blue-500",   pill: "bg-blue-100 text-blue-700 border-blue-200" },
  deadline: { label: "Deadline", bg: "bg-red-500",    border: "border-l-red-500",    dot: "bg-red-500",    pill: "bg-red-100 text-red-700 border-red-200" },
  brand:    { label: "Brand",    bg: "bg-orange-500", border: "border-l-orange-500", dot: "bg-orange-500", pill: "bg-orange-100 text-orange-700 border-orange-200" },
  internal: { label: "Intern",   bg: "bg-green-500",  border: "border-l-green-500",  dot: "bg-green-500",  pill: "bg-green-100 text-green-700 border-green-200" },
  posting:  { label: "Posting",  bg: "bg-pink-500",   border: "border-l-pink-500",   dot: "bg-pink-500",   pill: "bg-pink-100 text-pink-700 border-pink-200" },
}

const ALL_TYPES = Object.keys(TYPE_CONFIG) as EventType[]
const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none:    "Keine Wiederholung",
  daily:   "Täglich",
  weekly:  "Wöchentlich",
  monthly: "Monatlich",
  yearly:  "Jährlich",
}
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 64 // px per hour in time-grid views

const MEMBER_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#14b8a6"]

const EMPTY_FORM: FormState = {
  title: "",
  notes: "",
  start_date: "",
  start_time: "09:00",
  end_date: "",
  end_time: "10:00",
  type: "internal",
  location: "",
  creator_id: "",
  attendee_ids: [],
  all_day: false,
  recurrence: "none",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCalEvent(db: DbEvent): CalEvent {
  const start = new Date(db.start_at)
  const end = db.end_at ? new Date(db.end_at) : new Date(start.getTime() + 60 * 60 * 1000)
  return {
    id: db.id,
    title: db.title,
    notes: db.notes,
    startTime: start,
    endTime: end,
    type: db.type,
    location: db.location,
    creatorId: db.creator_id,
    attendeeIds: db.attendee_ids ?? [],
    allDay: db.all_day ?? false,
    recurrence: (db.recurrence ?? "none") as Recurrence,
    creator: db.creators,
  }
}

/** "YYYY-MM-DD" + "HH:mm" → UTC ISO string */
function combineToISO(date: string, time: string): string {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString()
}

/** UTC ISO string → { date: "YYYY-MM-DD", time: "HH:mm" } (local) */
function splitISO(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-")
  const time = [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
  ].join(":")
  return { date, time }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getMemberColor(id: string): string {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return MEMBER_COLORS[sum % MEMBER_COLORS.length]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── EventChip ────────────────────────────────────────────────────────────────

function EventChip({
  event,
  onClick,
  onDragStart,
  onDragEnd,
  compact = false,
}: {
  event: CalEvent
  onClick: (e: CalEvent) => void
  onDragStart: (e: CalEvent) => void
  onDragEnd: () => void
  compact?: boolean
}) {
  const cfg = TYPE_CONFIG[event.type]
  return (
    <div
      draggable
      onDragStart={() => onDragStart(event)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(event)}
      className={cn(
        "cursor-pointer truncate rounded border-l-2 bg-accent px-1.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/70 hover:shadow-sm",
        cfg.border,
        compact ? "py-0.5" : "py-1",
      )}
    >
      {!compact && <span className="mr-1 text-muted-foreground">{formatTime(event.startTime)}</span>}
      {event.title}
    </div>
  )
}

// ─── MonthView ────────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  currentDate: Date
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
  onDayClick: (date: Date) => void
  onDragStart: (e: CalEvent) => void
  onDragEnd: () => void
  onDrop: (date: Date) => void
}) {
  const today = new Date()
  const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const gridStart = getMondayOfWeek(firstOfMonth)
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const e of events) {
      const key = e.startTime.toDateString()
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return map
  }, [events])

  return (
    <Card className="flex flex-1 flex-col overflow-hidden min-h-0">
      <div className="grid grid-cols-7 border-b shrink-0">
        {WEEKDAYS.map((d) => (
          <div key={d} className="border-r p-2 text-center text-sm font-medium text-muted-foreground last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 overflow-auto">
        {days.map((day, i) => {
          const dayEvents = eventsByDay.get(day.toDateString()) ?? []
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(day, today)
          return (
            <div
              key={i}
              className={cn("min-h-20 border-b border-r p-1 last:border-r-0", !isCurrentMonth && "bg-muted/30")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
            >
              <div
                onClick={() => onDayClick(day)}
                className={cn(
                  "mb-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-sm transition-colors hover:bg-accent",
                  isToday && "bg-primary text-primary-foreground font-semibold hover:bg-primary/90",
                  !isCurrentMonth && "text-muted-foreground",
                )}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip key={ev.id} event={ev} onClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} compact />
                ))}
                {dayEvents.length > 3 && (
                  <p className="pl-1 text-xs text-muted-foreground">+{dayEvents.length - 3} weitere</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Time-grid helpers ────────────────────────────────────────────────────────

function getEventPosition(ev: CalEvent): { top: number; height: number } {
  const startH = ev.startTime.getHours() + ev.startTime.getMinutes() / 60
  const endH   = ev.endTime.getHours()   + ev.endTime.getMinutes()   / 60
  const duration = Math.max(endH - startH, 0.25) // at least 15 min
  return {
    top:    startH   * HOUR_HEIGHT,
    height: Math.max(duration * HOUR_HEIGHT, 22),
  }
}

function TimeGridEvent({
  event,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  event: CalEvent
  onClick: (e: CalEvent) => void
  onDragStart: (e: CalEvent) => void
  onDragEnd: () => void
}) {
  const cfg = TYPE_CONFIG[event.type]
  return (
    <div
      className={cn(
        "absolute inset-x-0.5 overflow-hidden rounded-md border-l-2 bg-accent px-1.5 py-0.5 cursor-pointer text-accent-foreground",
        cfg.border,
      )}
      style={{ top: 0, bottom: 0 }}
      onClick={() => onClick(event)}
      draggable
      onDragStart={() => onDragStart(event)}
      onDragEnd={onDragEnd}
    >
      <p className="truncate text-xs font-semibold leading-tight">{event.title}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">
        {formatTime(event.startTime)}–{formatTime(event.endTime)}
      </p>
    </div>
  )
}

// ─── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  events,
  onEventClick,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  currentDate: Date
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
  onDragStart: (e: CalEvent) => void
  onDragEnd: () => void
  onDrop: (date: Date, hour: number) => void
}) {
  const today = new Date()
  const monday = getMondayOfWeek(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      const key = ev.startTime.toDateString()
      map.set(key, [...(map.get(key) ?? []), ev])
    }
    return map
  }, [events])

  const gridHeight = HOURS.length * HOUR_HEIGHT

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Sticky header */}
      <div className="grid shrink-0 grid-cols-8 border-b bg-card">
        <div className="border-r" />
        {weekDays.map((day, i) => (
          <div
            key={day.toISOString()}
            className={cn("border-r p-2 text-center text-sm font-medium last:border-r-0", isSameDay(day, today) && "bg-primary/5")}
          >
            <div className={cn(isSameDay(day, today) && "text-primary font-semibold")}>{WEEKDAYS[i]}</div>
            <div className="text-muted-foreground">
              {day.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
            </div>
          </div>
        ))}
      </div>
      {/* Scrollable time grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8">
          {/* Time axis */}
          <div className="border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="flex items-start justify-end border-b pr-2 pt-1"
              >
                <span className="text-xs text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvs = eventsByDay.get(day.toDateString()) ?? []
            return (
              <div
                key={day.toISOString()}
                className="relative border-r last:border-r-0"
                style={{ height: gridHeight }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)))
                  onDrop(day, hour)
                }}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-b border-border/40"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  />
                ))}
                {/* Events */}
                {dayEvs.map((ev) => {
                  const { top, height } = getEventPosition(ev)
                  return (
                    <div key={ev.id} className="absolute inset-x-0.5" style={{ top, height }}>
                      <TimeGridEvent event={ev} onClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ─── DayView ──────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  events,
  onEventClick,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  currentDate: Date
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
  onDragStart: (e: CalEvent) => void
  onDragEnd: () => void
  onDrop: (date: Date, hour: number) => void
}) {
  const dayEvents = events.filter((e) => isSameDay(e.startTime, currentDate))
  const gridHeight = HOURS.length * HOUR_HEIGHT

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-auto">
        {/* Time axis */}
        <div className="w-16 shrink-0 border-r">
          {HOURS.map((hour) => (
            <div
              key={hour}
              style={{ height: HOUR_HEIGHT }}
              className="flex items-start justify-end border-b pr-2 pt-1"
            >
              <span className="text-sm text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
            </div>
          ))}
        </div>
        {/* Events column */}
        <div
          className="relative flex-1"
          style={{ height: gridHeight }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)))
            onDrop(currentDate, hour)
          }}
        >
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-b border-border/40"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            />
          ))}
          {/* Events */}
          {dayEvents.map((ev) => {
            const { top, height } = getEventPosition(ev)
            return (
              <div key={ev.id} className="absolute inset-x-2" style={{ top, height }}>
                <TimeGridEvent event={ev} onClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} />
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// ─── ListView ─────────────────────────────────────────────────────────────────

function ListView({
  events,
  onEventClick,
}: {
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
}) {
  const sorted = useMemo(() => [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()), [events])

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; events: CalEvent[] }>()
    for (const ev of sorted) {
      const key = ev.startTime.toDateString()
      if (!map.has(key)) {
        map.set(key, {
          label: ev.startTime.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          events: [],
        })
      }
      map.get(key)!.events.push(ev)
    }
    return Array.from(map.values())
  }, [sorted])

  if (groups.length === 0) {
    return (
      <Card className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Keine Events gefunden.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto min-h-0 pb-4">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{group.label}</h3>
          <Card className="divide-y">
            {group.events.map((ev) => {
              const cfg = TYPE_CONFIG[ev.type]
              return (
                <div
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent/50"
                >
                  <div className={cn("h-10 w-1 shrink-0 rounded-full", cfg.bg)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ev.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatTime(ev.startTime)} – {formatTime(ev.endTime)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {ev.creator && (
                      <span
                        className="inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold text-white bg-neutral-800"
                        title={ev.creator.full_name}
                      >
                        {ev.creator.initials}
                      </span>
                    )}
                    <Badge variant="outline" className={cn("text-xs", cfg.pill)}>
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      ))}
    </div>
  )
}

// ─── EventDialog ──────────────────────────────────────────────────────────────

function TimeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const parts = value.split(":")
  const h = parts[0] ?? "00"
  const m = parts[1] ?? "00"

  const commit = (newH: string, newM: string) =>
    onChange(`${newH.padStart(2, "0")}:${newM.padStart(2, "0")}`)

  return (
    <div className="flex h-9 w-full items-center rounded-lg border border-border bg-background px-2 text-sm focus-within:ring-1 focus-within:ring-ring">
      <input
        type="number"
        min={0}
        max={23}
        value={h}
        onChange={(e) => commit(String(Math.max(0, Math.min(23, parseInt(e.target.value) || 0))).padStart(2, "0"), m)}
        className="w-8 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground select-none">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={m}
        onChange={(e) => commit(h, String(Math.max(0, Math.min(59, parseInt(e.target.value) || 0))).padStart(2, "0"))}
        className="w-8 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  )
}

function EventDialog({
  open,
  isCreating,
  form,
  setForm,
  selectedEvent,
  setSelectedEvent,
  creators,
  teamMembers,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  saving,
}: {
  open: boolean
  isCreating: boolean
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  selectedEvent: CalEvent | null
  setSelectedEvent: React.Dispatch<React.SetStateAction<CalEvent | null>>
  creators: Creator[]
  teamMembers: TeamMember[]
  onClose: () => void
  onCreate: () => void
  onUpdate: () => void
  onDelete: (id: string) => void
  saving: boolean
}) {
  // Derived values for the "edit" side
  const editStart = selectedEvent ? splitISO(selectedEvent.startTime.toISOString()) : { date: "", time: "09:00" }
  const editEnd = selectedEvent ? splitISO(selectedEvent.endTime.toISOString()) : { date: "", time: "10:00" }

  const [editStartDate, setEditStartDate] = useState(editStart.date)
  const [editStartTime, setEditStartTime] = useState(editStart.time)
  const [editEndDate, setEditEndDate] = useState(editEnd.date)
  const [editEndTime, setEditEndTime] = useState(editEnd.time)

  // Sync local edit state whenever selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      const s = splitISO(selectedEvent.startTime.toISOString())
      const e = splitISO(selectedEvent.endTime.toISOString())
      setEditStartDate(s.date)
      setEditStartTime(s.time)
      setEditEndDate(e.date)
      setEditEndTime(e.time)
    }
  }, [selectedEvent?.id])

  function toggleAttendee(memberId: string) {
    if (isCreating) {
      setForm((f) => ({
        ...f,
        attendee_ids: f.attendee_ids.includes(memberId)
          ? f.attendee_ids.filter((id) => id !== memberId)
          : [...f.attendee_ids, memberId],
      }))
    } else {
      setSelectedEvent((ev) =>
        ev
          ? {
              ...ev,
              attendeeIds: ev.attendeeIds.includes(memberId)
                ? ev.attendeeIds.filter((id) => id !== memberId)
                : [...ev.attendeeIds, memberId],
            }
          : null,
      )
    }
  }

  const activeAttendees = isCreating ? form.attendee_ids : (selectedEvent?.attendeeIds ?? [])

  function handleSave() {
    if (!isCreating && selectedEvent) {
      // Merge edited date/time back into selectedEvent before calling onUpdate
      setSelectedEvent((ev) =>
        ev
          ? {
              ...ev,
              startTime: editStartDate ? new Date(combineToISO(editStartDate, editStartTime)) : ev.startTime,
              endTime: editEndDate ? new Date(combineToISO(editEndDate, editEndTime)) : ev.endTime,
            }
          : null,
      )
    }
    // Delay one tick so the state update above lands before the fetch
    setTimeout(isCreating ? onCreate : onUpdate, 0)
  }

  const canSave = isCreating
    ? !!form.title.trim() && !!form.start_date
    : !!selectedEvent?.title.trim() && !!editStartDate

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreating ? "Neues Event" : "Event bearbeiten"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title + Ganztägig */}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" />Titel</Label>
              <Input
                placeholder="Event-Titel"
                autoFocus
                value={isCreating ? form.title : (selectedEvent?.title ?? "")}
                onChange={(e) =>
                  isCreating
                    ? setForm((f) => ({ ...f, title: e.target.value }))
                    : setSelectedEvent((ev) => ev ? { ...ev, title: e.target.value } : null)
                }
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 pb-1.5">
              <Switch
                checked={isCreating ? form.all_day : (selectedEvent?.allDay ?? false)}
                onCheckedChange={(checked) =>
                  isCreating
                    ? setForm((f) => ({ ...f, all_day: checked }))
                    : setSelectedEvent((ev) => ev ? { ...ev, allDay: checked } : null)
                }
              />
              <Label className="cursor-pointer whitespace-nowrap text-sm">Ganztägig</Label>
            </div>
          </div>

          {/* Teilnehmer */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Teilnehmer
            </Label>
            <Popover>
              <PopoverTrigger
                className="flex min-h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none hover:bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
              >
                {activeAttendees.length === 0 ? (
                  <span className="text-muted-foreground">Teilnehmer hinzufügen…</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {activeAttendees.map((id) => {
                      const m = teamMembers.find((tm) => tm.id === id)
                      if (!m) return null
                      const bg = m.color ?? getMemberColor(id)
                      const abbr = m.initials ?? getInitials(m.display_name ?? "")
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: bg }}
                        >
                          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">
                            {abbr}
                          </span>
                          {m.display_name ?? abbr}
                        </span>
                      )
                    })}
                  </span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="start">
                {teamMembers.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    Keine Teammitglieder gefunden
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {teamMembers.map((member) => {
                      const active = activeAttendees.includes(member.id)
                      const color = member.color ?? getMemberColor(member.id)
                      const initials = member.initials ?? getInitials(member.display_name ?? "")
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => toggleAttendee(member.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                            active ? "bg-muted" : "hover:bg-muted/60",
                          )}
                        >
                          <span
                            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {initials}
                          </span>
                          <span className="flex-1 truncate text-left">{member.display_name ?? initials}</span>
                          <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                          {active && (
                            <span className="ml-1 text-xs font-medium text-primary">✓</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Start */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Start</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <DatePicker
                  value={isCreating ? form.start_date || null : editStartDate || null}
                  onChange={(v) =>
                    isCreating
                      ? setForm((f) => ({ ...f, start_date: v ?? "" }))
                      : setEditStartDate(v ?? "")
                  }
                  placeholder="Datum"
                />
              </div>
              {!(isCreating ? form.all_day : (selectedEvent?.allDay ?? false)) && (
                <div className="w-32">
                  <TimeInput
                    value={isCreating ? form.start_time : editStartTime}
                    onChange={(v) =>
                      isCreating ? setForm((f) => ({ ...f, start_time: v })) : setEditStartTime(v)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Ende */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5" />Ende</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <DatePicker
                  value={isCreating ? form.end_date || null : editEndDate || null}
                  onChange={(v) =>
                    isCreating
                      ? setForm((f) => ({ ...f, end_date: v ?? "" }))
                      : setEditEndDate(v ?? "")
                  }
                  placeholder="Datum"
                />
              </div>
              {!(isCreating ? form.all_day : (selectedEvent?.allDay ?? false)) && (
                <div className="w-32">
                  <TimeInput
                    value={isCreating ? form.end_time : editEndTime}
                    onChange={(v) =>
                      isCreating ? setForm((f) => ({ ...f, end_time: v })) : setEditEndTime(v)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Wiederholung */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" />Wiederholung</Label>
            <Select
              value={isCreating ? form.recurrence : (selectedEvent?.recurrence ?? "none")}
              onValueChange={(v) =>
                isCreating
                  ? setForm((f) => ({ ...f, recurrence: v as Recurrence }))
                  : setSelectedEvent((ev) => ev ? { ...ev, recurrence: v as Recurrence } : null)
              }
            >
              <SelectTrigger>
                <span className="text-sm">
                  {RECURRENCE_LABELS[isCreating ? form.recurrence : (selectedEvent?.recurrence ?? "none")]}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Wiederholung</SelectItem>
                <SelectItem value="daily">Täglich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="monthly">Monatlich</SelectItem>
                <SelectItem value="yearly">Jährlich</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Typ + Creator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Typ</Label>
              <Select
                value={isCreating ? form.type : (selectedEvent?.type ?? "internal")}
                onValueChange={(v) =>
                  isCreating
                    ? setForm((f) => ({ ...f, type: v as EventType }))
                    : setSelectedEvent((ev) => ev ? { ...ev, type: v as EventType } : null)
                }
              >
                <SelectTrigger>
                  {(() => {
                    const t = isCreating ? form.type : (selectedEvent?.type ?? "internal")
                    return (
                      <span className="flex items-center gap-2 text-sm">
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TYPE_CONFIG[t].dot)} />
                        {TYPE_CONFIG[t].label}
                      </span>
                    )
                  })()}
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full", TYPE_CONFIG[t].dot)} />
                        {TYPE_CONFIG[t].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Creator</Label>
              {(() => {
                const selectedId = isCreating ? form.creator_id : selectedEvent?.creatorId
                const displayCreator = creators.find((c) => c.id === selectedId)
                return (
                  <Select
                    value={selectedId || "none"}
                    onValueChange={(v) =>
                      isCreating
                        ? setForm((f) => ({ ...f, creator_id: v === "none" ? "" : (v ?? "") }))
                        : setSelectedEvent((ev) => ev ? { ...ev, creatorId: v === "none" ? null : (v ?? null) } : null)
                    }
                  >
                    <SelectTrigger>
                      {displayCreator ? (
                        <span className="flex items-center gap-2 text-sm">
                          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white bg-neutral-800">
                            {displayCreator.initials}
                          </span>
                          {displayCreator.full_name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Kein Creator</span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Creator</SelectItem>
                      {creators.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span className="inline-flex size-4 items-center justify-center rounded-full bg-neutral-800 text-[9px] font-semibold text-white">
                              {c.initials}
                            </span>
                            {c.full_name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              })()}
            </div>
          </div>

          {/* Ort */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Ort</Label>
            <Input
              placeholder="Ort / Adresse"
              value={isCreating ? form.location : (selectedEvent?.location ?? "")}
              onChange={(e) =>
                isCreating
                  ? setForm((f) => ({ ...f, location: e.target.value }))
                  : setSelectedEvent((ev) => ev ? { ...ev, location: e.target.value } : null)
              }
            />
          </div>

          {/* Notizen */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Notizen</Label>
            <Textarea
              placeholder="Zusätzliche Informationen…"
              rows={2}
              value={isCreating ? form.notes : (selectedEvent?.notes ?? "")}
              onChange={(e) =>
                isCreating
                  ? setForm((f) => ({ ...f, notes: e.target.value }))
                  : setSelectedEvent((ev) => ev ? { ...ev, notes: e.target.value } : null)
              }
            />
          </div>
        </div>

        <DialogFooter>
          {!isCreating && selectedEvent && (
            <Button variant="destructive" onClick={() => onDelete(selectedEvent.id)} disabled={saving}>
              Löschen
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Speichern…" : isCreating ? "Erstellen" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventManager() {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day" | "list">("month")
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [draggedEvent, setDraggedEvent] = useState<CalEvent | null>(null)
  const [filterType, setFilterType] = useState<EventType | "all">("all")
  const [filterCreator, setFilterCreator] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const { rangeFrom, rangeTo } = useMemo(() => {
    const from = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
    return { rangeFrom: from.toISOString(), rangeTo: to.toISOString() }
  }, [currentDate])

  const { data, isPending: loading } = useQuery<{ events: DbEvent[] }>({
    queryKey: QueryKeys.events.range(rangeFrom, rangeTo),
    queryFn: () =>
      fetch(`/api/events?from=${encodeURIComponent(rangeFrom)}&to=${encodeURIComponent(rangeTo)}`).then((r) => r.json()),
    staleTime: 2 * 60_000,
  })

  const { data: creatorsData } = useQuery<{ creators: Creator[] }>({
    queryKey: QueryKeys.creators.list(),
    queryFn: () => fetch("/api/creators/list").then((r) => r.json()),
    staleTime: 5 * 60_000,
  })
  const creators = creatorsData?.creators ?? []

  const { data: membersData } = useQuery<{ users: TeamMember[] }>({
    queryKey: QueryKeys.members.list(),
    queryFn: () => fetch("/api/agency/users").then((r) => r.json()),
    staleTime: 5 * 60_000,
  })
  const teamMembers = membersData?.users ?? []

  const allEvents = useMemo(() => (data?.events ?? []).map(toCalEvent), [data])

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (filterType !== "all" && ev.type !== filterType) return false
      if (filterCreator !== "all" && ev.creatorId !== filterCreator) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!ev.title.toLowerCase().includes(q) && !ev.notes?.toLowerCase().includes(q) && !ev.location?.toLowerCase().includes(q))
          return false
      }
      return true
    })
  }, [allEvents, filterType, filterCreator, searchQuery])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: QueryKeys.events.all() })
  }

  const navigateDate = useCallback(
    (dir: "prev" | "next") => {
      setCurrentDate((prev) => {
        const d = new Date(prev)
        const delta = dir === "next" ? 1 : -1
        if (view === "month") d.setMonth(prev.getMonth() + delta)
        else if (view === "week") d.setDate(prev.getDate() + delta * 7)
        else if (view === "day") d.setDate(prev.getDate() + delta)
        return d
      })
    },
    [view],
  )

  async function handleCreate() {
    if (!form.title.trim() || !form.start_date || saving) return
    setSaving(true)
    try {
      const startTime = form.all_day ? "00:00" : form.start_time
      const endTime   = form.all_day ? "23:59" : form.end_time
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        type: form.type,
        start_at: combineToISO(form.start_date, startTime),
        attendee_ids: form.attendee_ids,
        all_day: form.all_day,
        recurrence: form.recurrence,
      }
      if (form.end_date) body.end_at = combineToISO(form.end_date, endTime)
      else if (form.all_day) body.end_at = combineToISO(form.start_date, "23:59")
      if (form.notes.trim()) body.notes = form.notes.trim()
      if (form.location.trim()) body.location = form.location.trim()
      if (form.creator_id) body.creator_id = form.creator_id

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) { invalidate(); closeDialog() }
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedEvent || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedEvent.title,
          type: selectedEvent.type,
          start_at: selectedEvent.startTime.toISOString(),
          end_at: selectedEvent.endTime.toISOString(),
          notes: selectedEvent.notes || null,
          location: selectedEvent.location || null,
          creator_id: selectedEvent.creatorId || null,
          attendee_ids: selectedEvent.attendeeIds,
          all_day: selectedEvent.allDay,
          recurrence: selectedEvent.recurrence,
        }),
      })
      if (res.ok) { invalidate(); closeDialog() }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" })
    invalidate()
    closeDialog()
  }

  const handleDrop = useCallback(
    (date: Date, hour?: number) => {
      if (!draggedEvent) return
      const duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime()
      const newStart = new Date(date)
      if (hour !== undefined) newStart.setHours(hour, 0, 0, 0)
      const newEnd = new Date(newStart.getTime() + duration)
      fetch(`/api/events/${draggedEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: newStart.toISOString(), end_at: newEnd.toISOString() }),
      }).then(() => invalidate())
      setDraggedEvent(null)
    },
    [draggedEvent],
  )

  function openCreate(prefillDate?: Date) {
    const start = prefillDate ? new Date(prefillDate) : new Date()
    start.setMinutes(0, 0, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const sd = splitISO(start.toISOString())
    const ed = splitISO(end.toISOString())
    setForm({ ...EMPTY_FORM, start_date: sd.date, start_time: sd.time, end_date: ed.date, end_time: ed.time })
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setIsCreating(false)
    setSelectedEvent(null)
    setForm(EMPTY_FORM)
  }

  const headerTitle = useMemo(() => {
    if (view === "month") return currentDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
    if (view === "week") {
      const mon = getMondayOfWeek(currentDate)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return `${mon.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} – ${sun.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}`
    }
    if (view === "day")
      return currentDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    return "Alle Events"
  }, [view, currentDate])

  const viewButtons = [
    { key: "month", label: "Monat", Icon: Calendar },
    { key: "week",  label: "Woche", Icon: Grid3x3 },
    { key: "day",   label: "Tag",   Icon: Clock },
    { key: "list",  label: "Liste", Icon: List },
  ] as const

  const hasFilters = filterType !== "all" || filterCreator !== "all" || !!searchQuery

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{headerTitle}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Heute</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
            {viewButtons.map(({ key, label, Icon }) => (
              <Button key={key} variant={view === key ? "secondary" : "ghost"} size="sm" className="h-8" onClick={() => setView(key)}>
                <Icon className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            Neues Event
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative min-w-45 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Events suchen…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setSearchQuery("")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | "all")}>
          <SelectTrigger className="w-auto min-w-32">
            {filterType === "all" ? (
              <span className="text-muted-foreground">Alle Typen</span>
            ) : (
              <span className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", TYPE_CONFIG[filterType].dot)} />
                {TYPE_CONFIG[filterType].label}
              </span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {ALL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", TYPE_CONFIG[t].dot)} />
                  {TYPE_CONFIG[t].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCreator} onValueChange={(v) => setFilterCreator(v ?? "all")}>
          <SelectTrigger className="w-auto min-w-32">
            {filterCreator === "all" ? (
              <span className="text-muted-foreground">Alle Creator</span>
            ) : (
              (() => {
                const c = creators.find((x) => x.id === filterCreator)
                return c ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-neutral-800 text-[9px] font-semibold text-white">
                      {c.initials}
                    </span>
                    {c.full_name}
                  </span>
                ) : <span className="text-muted-foreground">Alle Creator</span>
              })()
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Creator</SelectItem>
            {creators.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span className="inline-flex size-4 items-center justify-center rounded-full bg-neutral-800 text-[9px] font-semibold text-white">
                    {c.initials}
                  </span>
                  {c.full_name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType("all"); setFilterCreator("all"); setSearchQuery("") }} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Zurücksetzen
          </Button>
        )}
      </div>

      {/* ── Calendar ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Lade Events…</p>
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={(ev) => { setSelectedEvent(ev); setIsCreating(false); setIsDialogOpen(true) }}
              onDayClick={openCreate}
              onDragStart={setDraggedEvent}
              onDragEnd={() => setDraggedEvent(null)}
              onDrop={handleDrop}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={(ev) => { setSelectedEvent(ev); setIsCreating(false); setIsDialogOpen(true) }}
              onDragStart={setDraggedEvent}
              onDragEnd={() => setDraggedEvent(null)}
              onDrop={handleDrop}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              events={filteredEvents}
              onEventClick={(ev) => { setSelectedEvent(ev); setIsCreating(false); setIsDialogOpen(true) }}
              onDragStart={setDraggedEvent}
              onDragEnd={() => setDraggedEvent(null)}
              onDrop={handleDrop}
            />
          )}
          {view === "list" && (
            <ListView
              events={filteredEvents}
              onEventClick={(ev) => { setSelectedEvent(ev); setIsCreating(false); setIsDialogOpen(true) }}
            />
          )}
        </>
      )}

      {/* ── Dialog ── */}
      <EventDialog
        open={isDialogOpen}
        isCreating={isCreating}
        form={form}
        setForm={setForm}
        selectedEvent={selectedEvent}
        setSelectedEvent={setSelectedEvent}
        creators={creators}
        teamMembers={teamMembers}
        onClose={closeDialog}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        saving={saving}
      />
    </div>
  )
}
