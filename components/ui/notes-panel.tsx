"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { Calendar, Edit3, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@talentos/ui";
import { FloatingWindow } from "@/components/ui/floating-window";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { Creator, Brand } from "@/domains/creators/types";
import { Avatar } from "@/components/ui/avatar-creator";

// ─── Types ────────────────────────────────────────────────────────────────────

type Note = {
  id: string;
  title: string;
  content: string;
  creator_id: string | null;
  brand_id: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const { data: creatorsData } = useQuery<{ creators: Creator[] }>({
    queryKey: QueryKeys.creators.list(),
    queryFn: () => fetch("/api/creators/list").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  const creators = creatorsData?.creators ?? [];

  const { data: brandsData } = useQuery<{ brands: Brand[] }>({
    queryKey: QueryKeys.brands.list(),
    queryFn: () => fetch("/api/brands").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  const brands = brandsData?.brands ?? [];

  // Debounce PATCH: track a timer per note id
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) return;
      const data = await res.json();
      const fetched: Note[] = data.notes ?? [];
      setNotes(fetched);
      setActiveNote((prev) => {
        if (prev) {
          // Keep active note in sync after refresh
          return fetched.find((n) => n.id === prev.id) ?? fetched[0] ?? null;
        }
        return fetched[0] ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stripHtml(n.content).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  async function addNote() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Neue Notiz", content: "" }),
      });
      if (!res.ok) return;
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
      setActiveNote(note);
    } finally {
      setCreating(false);
    }
  }

  async function deleteNote(note: Note) {
    const previous = notes;
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== note.id);
      if (activeNote?.id === note.id) setActiveNote(next[0] ?? null);
      return next;
    });
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    if (!res.ok) setNotes(previous);
  }

  function updateNote(patch: Partial<Pick<Note, "title" | "content" | "creator_id" | "brand_id">>) {
    if (!activeNote) return;
    const updated = { ...activeNote, ...patch };
    setActiveNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

    // Debounce the API call so we don't hit the server on every keystroke
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/notes/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    }, 600);
  }

  const assignedCreator = creators.find((c) => c.id === activeNote?.creator_id);
  const assignedBrand = brands.find((b) => b.id === activeNote?.brand_id);

  return (
    <>
      <FloatingWindow.Header title="Notizen" />

      <FloatingWindow.Body className="p-0 flex overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <div className="flex w-52 shrink-0 flex-col border-r border-border bg-muted/40">
          <div className="space-y-2 p-3">
            <Input
              type="text"
              placeholder="Suchen…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startAdornment={<Search />}
              className="text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={addNote}
              disabled={creating}
              className="h-auto w-full gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground hover:opacity-80"
            >
              <Plus className="size-3.5" />
              Neue Notiz
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <p className="p-4 text-xs text-muted-foreground">Lade…</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground">Keine Notizen gefunden.</p>
            )}
            {filtered.map((note) => {
              const creator = creators.find((c) => c.id === note.creator_id);
              const brand = brands.find((b) => b.id === note.brand_id);
              return (
                <Button
                  key={note.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveNote(note)}
                  className={`h-auto flex-col items-stretch group w-full rounded-none border-b border-border/60 p-3 text-left hover:bg-muted/60 ${
                    activeNote?.id === note.id
                      ? "border-l-2 border-l-foreground bg-background"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="truncate text-xs font-semibold text-foreground">{note.title || "Ohne Titel"}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); deleteNote(note); }}
                      className="size-auto invisible shrink-0 rounded p-0.5 text-muted-foreground hover:text-red-600 hover:bg-transparent group-hover:visible"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {stripHtml(note.content) || "Leere Notiz"}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      <Calendar className="size-3" />
                      {formatTime(note.updated_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      {creator && (
                        <Avatar initials={creator.initials} avatarConfig={creator.avatar_config} name={creator.full_name} className="size-4 text-[9px]" />
                      )}
                      {brand && (
                        <span
                          className="inline-flex h-4 items-center rounded bg-zinc-100 px-1 text-[9px] font-bold text-zinc-500"
                          title={brand.company_name}
                        >
                          {brand.short_code}
                        </span>
                      )}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* ── Editor ──────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-card">
          {activeNote ? (
            <>
              {/* Header: timestamp + title */}
              <div className="border-b border-border px-5 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Edit3 className="size-3.5" />
                  {formatTime(activeNote.updated_at)}
                </div>
                <Input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote({ title: e.target.value })}
                  placeholder="Titel…"
                  className="h-auto rounded-none border-0 bg-transparent p-0 text-lg font-bold text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />

                {/* Creator + Brand assignment */}
                <div className="mt-3 flex items-center gap-2">
                  <Select
                    value={activeNote.creator_id ?? "none"}
                    onValueChange={(v) => updateNote({ creator_id: v && v !== "none" ? v : null })}
                  >
                    <SelectTrigger className="h-7 rounded-full border-0 bg-muted px-3 text-xs">
                      <SelectValue>
                        {assignedCreator ? (
                          <span className="flex items-center gap-1.5">
                            <Avatar initials={assignedCreator.initials} avatarConfig={assignedCreator.avatar_config} name={assignedCreator.full_name} className="size-4 text-[9px]" />
                            {assignedCreator.full_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Creator…</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Kein Creator</span>
                      </SelectItem>
                      {creators.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <Avatar initials={c.initials} avatarConfig={c.avatar_config} name={c.full_name} className="size-5 text-[10px]" />
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={activeNote.brand_id ?? "none"}
                    onValueChange={(v) => updateNote({ brand_id: v && v !== "none" ? v : null })}
                  >
                    <SelectTrigger className="h-7 rounded-full border-0 bg-muted px-3 text-xs">
                      <SelectValue>
                        {assignedBrand ? (
                          <span className="flex items-center gap-1.5">
                            <span className="inline-flex h-4 items-center rounded bg-zinc-100 px-1 text-[9px] font-bold text-zinc-500">
                              {assignedBrand.short_code}
                            </span>
                            {assignedBrand.company_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Brand…</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Kein Brand</span>
                      </SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="inline-flex h-5 items-center rounded bg-zinc-100 px-1.5 text-[10px] font-bold text-zinc-500">
                            {b.short_code}
                          </span>
                          {b.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rich text editor */}
              <RichTextEditor
                noteId={activeNote.id}
                content={activeNote.content}
                onChange={(html) => updateNote({ content: html })}
                className="flex-1"
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <StickyNote className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {loading ? "Lade…" : "Notiz auswählen oder neu erstellen"}
              </p>
            </div>
          )}
        </div>
      </FloatingWindow.Body>
    </>
  );
}
