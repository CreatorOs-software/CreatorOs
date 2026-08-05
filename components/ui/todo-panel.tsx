"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FloatingWindow } from "@/components/ui/floating-window";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Creator } from "@/domains/creators/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "niedrig" | "mittel" | "hoch";

type TodoAssignee = {
  id: string;
  full_name: string;
  initials: string;
  color: string;
};

type TodoItem = {
  id: string;
  title: string;
  done: boolean;
  due_date?: string | null;
  assignee?: TodoAssignee | null;
  priority?: Priority | null;
};

type FormState = {
  title: string;
  due_date: string;
  assignee_id: string;
  priority: Priority | "";
};

const EMPTY_FORM: FormState = {
  title: "",
  due_date: "",
  assignee_id: "",
  priority: "",
};

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; activeClass: string; dotClass: string }
> = {
  niedrig: {
    label: "Niedrig",
    activeClass: "bg-emerald-100 text-emerald-700 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
  mittel: {
    label: "Mittel",
    activeClass: "bg-amber-100 text-amber-700 border-amber-300",
    dotClass: "bg-amber-500",
  },
  hoch: {
    label: "Hoch",
    activeClass: "bg-red-100 text-red-700 border-red-300",
    dotClass: "bg-red-500",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function TodoPanel() {
  const queryClient = useQueryClient();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isPending: loading } = useQuery<{ todos: TodoItem[] }>({
    queryKey: QueryKeys.todos.all(),
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  const items = data?.todos ?? [];

  useEffect(() => {
    fetch("/api/creators/list")
      .then((r) => r.json())
      .then((d: { creators?: Creator[] }) => setCreators(d.creators ?? []))
      .catch(() => {});
  }, []);

  const allDone = useMemo(
    () => items.length > 0 && items.every((i) => i.done),
    [items],
  );

  const [celebrating, setCelebrating] = useState(false);
  const wasAllDoneRef = useRef(false);

  useEffect(() => {
    if (!allDone) {
      wasAllDoneRef.current = false;
      return;
    }
    if (wasAllDoneRef.current) return;
    wasAllDoneRef.current = true;
    setCelebrating(true);
    const t = setTimeout(() => setCelebrating(false), 4000);
    return () => clearTimeout(t);
  }, [allDone]);

  function patchCache(updater: (t: TodoItem) => TodoItem) {
    queryClient.setQueryData<{ todos: TodoItem[] }>(QueryKeys.todos.all(), (old) => ({
      todos: (old?.todos ?? []).map(updater),
    }));
  }

  async function toggleItem(item: TodoItem) {
    patchCache((t) => t.id === item.id ? { ...t, done: !t.done } : t);
    const res = await fetch(`/api/todos/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    if (!res.ok) {
      patchCache((t) => t.id === item.id ? { ...t, done: item.done } : t);
    }
  }

  async function handleAdd() {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { title: form.title.trim() };
      if (form.due_date) body.due_date = form.due_date;
      if (form.assignee_id) body.assignee_id = form.assignee_id;
      if (form.priority) body.priority = form.priority;

      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const { todo } = await res.json();
      queryClient.setQueryData<{ todos: TodoItem[] }>(QueryKeys.todos.all(), (old) => ({
        todos: [...(old?.todos ?? []), todo],
      }));
      setForm(EMPTY_FORM);
      setView("list");
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setForm(EMPTY_FORM);
    setView("list");
  }

  // ── Form view ──────────────────────────────────────────────────────────────

  if (view === "form") {
    return (
      <>
        <FloatingWindow.Header title="Neue Aufgabe" onBack={handleBack} />
        <FloatingWindow.Body className="flex flex-col gap-3">
          <Input
            placeholder="Was möchtest du erledigen?"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Fällig am
            </span>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, due_date: e.target.value }))
              }
              className="h-9 w-full rounded-full px-4 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              style={{ backgroundColor: "var(--input)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Zuweisen an
            </span>
            <Select
              value={form.assignee_id}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, assignee_id: v ?? "" }))
              }
            >
              <SelectTrigger
                className="w-full rounded-full border-0 px-4"
                style={{ backgroundColor: "var(--input)" }}
              >
                <SelectValue placeholder="Creator auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {creators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.initials}
                    </span>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Priorität
            </span>
            <div className="flex gap-2">
              {(["niedrig", "mittel", "hoch"] as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const active = form.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, priority: active ? "" : p }))
                    }
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-medium transition-colors",
                      active
                        ? cfg.activeClass
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className={cn("size-2 rounded-full", cfg.dotClass)} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-2">
            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={!form.title.trim() || saving}
            >
              {saving ? "Speichern…" : "Hinzufügen"}
            </Button>
          </div>
        </FloatingWindow.Body>
      </>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <>
      <FloatingWindow.Header title="Todos" className={cn("border-b-0")}>
        <button
          type="button"
          onClick={() => setView("form")}
          className="flex items-center gap-1 rounded-md bg-black/10 px-2 py-1 text-xs font-semibold text-gray-900 transition-colors hover:bg-black/15"
        >
          <Plus className="size-3" />
          Neu
        </button>
      </FloatingWindow.Header>

      <FloatingWindow.Body className="p-0">
        <div
          className={cn(
            "h-full overflow-auto p-4",
            allDone
              ? "bg-[radial-gradient(circle,rgba(16,185,129,0.08)_1px,transparent_1px)]"
              : "bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)]",
            "bg-size-[10px_10px]",
          )}
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Lade…</p>
          ) : (
            <>
              <h3 className="mb-3 text-base font-bold text-foreground">
                {allDone ? "Du hast alles erledigt!" : "Heute zu tun"}
              </h3>

              {!allDone && (
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
                        item.done && "bg-black/5",
                      )}
                    >
                      <label className="relative inline-flex size-6 shrink-0 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleItem(item)}
                          className="peer absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
                        />
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-md border transition-all duration-200",
                            item.done
                              ? "scale-95 border-foreground bg-foreground"
                              : "scale-100 border-border bg-background",
                          )}
                        >
                          <svg
                            className={cn(
                              "size-3 text-white transition-opacity duration-200",
                              item.done ? "opacity-100" : "opacity-0",
                            )}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 12 9"
                          >
                            <path
                              d="M1 4.2L4 7L11 1"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </label>

                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        {item.priority && (
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              PRIORITY_CONFIG[item.priority].dotClass,
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "truncate text-sm transition-all duration-200",
                            item.done
                              ? "text-muted-foreground line-through"
                              : "text-foreground",
                          )}
                        >
                          {item.title}
                        </span>
                      </div>

                      {(item.due_date || item.assignee) && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          {item.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(item.due_date)}
                            </span>
                          )}
                          {item.assignee && (
                            <span
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: item.assignee.color }}
                              title={item.assignee.full_name}
                            >
                              {item.assignee.initials}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {allDone && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">
                    Gönn dir eine Pause – du hast es verdient!
                  </p>
                  {celebrating && <ConfettiOverlay />}
                </div>
              )}

              {!allDone && items.length > 0 && (
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                  Weiter so!
                </p>
              )}
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Noch keine Aufgaben. Leg los!
                </p>
              )}
            </>
          )}
        </div>
      </FloatingWindow.Body>
    </>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#06b6d4"];

const CONFETTI_PIECES = Array.from({ length: 36 }, (_, i) => ({
  left: Math.random() * 100,
  delay: Math.random() * 0.5,
  duration: 2.5 + Math.random() * 1.2,
  size: 6 + Math.random() * 6,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

function ConfettiOverlay() {
  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20vh) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(80vh) rotate(720deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .confetti-piece { animation: none !important; } }
      `}</style>
      <div className="pointer-events-none fixed inset-0">
        {CONFETTI_PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti-piece absolute rounded-sm"
            style={{
              left: `${p.left}%`,
              top: "-10px",
              width: `${p.size}px`,
              height: `${p.size * 0.4}px`,
              backgroundColor: p.color,
              animation: `confetti-fall ${p.duration}s ease-in forwards`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
