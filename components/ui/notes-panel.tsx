"use client";

import { useEffect, useState } from "react";
import { Calendar, Edit3, Plus, Search, StickyNote } from "lucide-react";
import { FloatingWindow } from "@/components/ui/floating-window";
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
  id: number;
  title: string;
  content: string;
  createdAt: string;
  creatorId?: string;
  brandId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

const INITIAL_NOTES: Note[] = [
  {
    id: 1,
    title: "Meeting-Notizen",
    content: "Projektzeitplan und Deliverables besprochen. Nächster Schritt: Mockups bis Freitag fertigstellen.",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 2,
    title: "Ideen",
    content: "Neue Feature-Ideen für das Dashboard: Creator-Rankings, Kampagnen-Übersicht, automatische Reports.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 3,
    title: "Follow-ups",
    content: "Mit Brands-Team wegen Q3-Budget abstimmen. Pitch-Deck für neuen Creator vorbereiten.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

// ─── Main panel ───────────────────────────────────────────────────────────────

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [activeNote, setActiveNote] = useState<Note>(INITIAL_NOTES[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    fetch("/api/creators/list")
      .then((r) => r.json())
      .then((d: { creators: Creator[] }) => setCreators(d.creators))
      .catch(() => {});
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d: { brands: Brand[] }) => setBrands(d.brands))
      .catch(() => {});
  }, []);

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  function addNote() {
    const newNote: Note = {
      id: Date.now(),
      title: "Neue Notiz",
      content: "",
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNote(newNote);
  }

  function updateNote(patch: Partial<Pick<Note, "title" | "content" | "creatorId" | "brandId">>) {
    const updated = { ...activeNote, ...patch };
    setActiveNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  const assignedCreator = creators.find((c) => c.id === activeNote?.creatorId);
  const assignedBrand = brands.find((b) => b.id === activeNote?.brandId);

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
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-80"
            >
              <Plus className="size-3.5" />
              Neue Notiz
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground">Keine Notizen gefunden.</p>
            )}
            {filtered.map((note) => {
              const creator = creators.find((c) => c.id === note.creatorId);
              const brand = brands.find((b) => b.id === note.brandId);
              return (
                <button
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className={`w-full border-b border-border/60 p-3 text-left transition-colors hover:bg-muted/60 ${
                    activeNote.id === note.id
                      ? "border-l-2 border-l-foreground bg-background"
                      : ""
                  }`}
                >
                  <div className="truncate text-xs font-semibold text-foreground">{note.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {note.content || "Leere Notiz"}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      <Calendar className="size-3" />
                      {formatTime(note.createdAt)}
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
              {/* Header: date + title */}
              <div className="border-b border-border px-5 py-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Edit3 className="size-3.5" />
                  {formatTime(activeNote.createdAt)}
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
                    value={activeNote.creatorId ?? "none"}
                    onValueChange={(v) => updateNote({ creatorId: v && v !== "none" ? v : undefined })}
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
                            style={{ backgroundColor: c.color }}
                          >
                            {c.initials}
                          </span>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={activeNote.brandId ?? "none"}
                    onValueChange={(v) => updateNote({ brandId: v && v !== "none" ? v : undefined })}
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
                            style={{ backgroundColor: b.color }}
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

              {/* Content textarea */}
              <div className="flex-1 overflow-hidden px-5 py-4">
                <textarea
                  value={activeNote.content}
                  onChange={(e) => updateNote({ content: e.target.value })}
                  placeholder="Fang an zu schreiben…"
                  className="h-full w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <StickyNote className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Notiz auswählen</p>
            </div>
          )}
        </div>
      </FloatingWindow.Body>
    </>
  );
}
