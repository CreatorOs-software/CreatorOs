"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Edit3, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { FloatingWindow } from "@/components/ui/floating-window";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Creator, Brand } from "@/domains/creators/types";

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
  const [creators, setCreators] = useState<Creator[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
    fetch("/api/creators/list")
      .then((r) => r.json())
      .then((d: { creators?: Creator[] }) => setCreators(d.creators ?? []))
      .catch(() => {});
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d: { brands?: Brand[] }) => setBrands(d.brands ?? []))
      .catch(() => {});
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
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== note.id);
      if (activeNote?.id === note.id) {
        setActiveNote(next[0] ?? null);
      }
      return next;
    });
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
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Suchen…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-full rounded-lg bg-background pl-8 pr-3 text-xs outline-none ring-1 ring-border focus:ring-ring/60 placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={addNote}
              disabled={creating}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              Neue Notiz
            </button>
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
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className={`group w-full border-b border-border/60 p-3 text-left transition-colors hover:bg-muted/60 ${
                    activeNote?.id === note.id
                      ? "border-l-2 border-l-foreground bg-background"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="truncate text-xs font-semibold text-foreground">{note.title || "Ohne Titel"}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note); }}
                      className="invisible shrink-0 rounded p-0.5 text-muted-foreground hover:text-red-600 group-hover:visible"
                    >
                      <Trash2 className="size-3" />
                    </button>
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
                        <span
                          className="inline-flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: creator.color ?? undefined }}
                          title={creator.full_name}
                        >
                          {creator.initials}
                        </span>
                      )}
                      {brand && (
                        <span
                          className="inline-flex h-4 items-center rounded px-1 text-[9px] font-bold text-white"
                          style={{ backgroundColor: brand.color ?? undefined }}
                          title={brand.company_name}
                        >
                          {brand.short_code}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
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
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote({ title: e.target.value })}
                  placeholder="Titel…"
                  className="w-full bg-transparent text-lg font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
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
                            <span
                              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{ backgroundColor: assignedCreator.color ?? undefined }}
                            >
                              {assignedCreator.initials}
                            </span>
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
                          <span
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                            style={{ backgroundColor: c.color ?? undefined }}
                          >
                            {c.initials}
                          </span>
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
                            <span
                              className="inline-flex h-4 items-center rounded px-1 text-[9px] font-bold text-white"
                              style={{ backgroundColor: assignedBrand.color ?? undefined }}
                            >
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
                          <span
                            className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: b.color ?? undefined }}
                          >
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
