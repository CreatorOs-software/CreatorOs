"use client";

import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@talentos/ui";
import { getCaretCoordinates } from "@/lib/templates/caret-position";
import {
  VARIABLE_MAP,
  VARIABLE_REGISTRY,
  type VariableEntry,
} from "@/lib/templates/variable-registry";
import type { Creator } from "../types";

// Only opens at a word boundary ("/" preceded by whitespace, newline, or the
// start of the text) so normal prose ("20/30", "und/oder") never triggers it.
const WORD_BOUNDARY_RE = /[\s\n]/;
const QUERY_RE = /^\/([a-zA-Z0-9_.]*)$/;

export type ResolveContext = {
  threadId?: string;
  /** The mailbox to resolve "creator" against when there's no thread yet (e.g. composing a new email). */
  integrationId?: string;
  creatorId?: string;
  brandId?: string;
};

type Options = {
  /** "literal" inserts `${path}` (template authoring). "resolve" fetches the
   * real value against resolveContext and falls back to the placeholder. */
  mode: "literal" | "resolve";
  resolveContext?: ResolveContext;
  /** Offered when a "creator.*" variable is picked but resolveContext has no
   * creatorId (e.g. mailbox not tied to a creator) — the menu then asks the
   * user to pick one, per-variable, before resolving and inserting it. */
  creators?: Creator[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onReplace: (next: string) => void;
  onUnresolved?: (paths: string[]) => void;
};

type PendingCreatorPick = { entry: VariableEntry; start: number; end: number };

export function useVariableSlashMenu({ mode, resolveContext, creators, textareaRef, onReplace, onUnresolved }: Options) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [pendingCreatorPick, setPendingCreatorPick] = useState<PendingCreatorPick | null>(null);
  const triggerStart = useRef(0);

  const items =
    open && !pendingCreatorPick
      ? VARIABLE_REGISTRY.filter(
          (v) =>
            v.path.toLowerCase().includes(query.toLowerCase()) ||
            v.label.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 8)
      : [];
  const creatorItems = pendingCreatorPick ? (creators ?? []) : [];

  function closeMenu() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    setPendingCreatorPick(null);
  }

  function openMenuAt(index: number) {
    const el = textareaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const caret = getCaretCoordinates(el, index);
    setPosition({ top: rect.top + caret.top + caret.height, left: rect.left + caret.left });
    triggerStart.current = index;
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  // Positions the menu at the current caret — used when a creator-pick step
  // is triggered from the "Variable einfügen" button, which has no "/"
  // trigger position of its own.
  function openMenuAtCaret() {
    const el = textareaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const index = el.selectionStart ?? el.value.length;
    const caret = getCaretCoordinates(el, index);
    setPosition({ top: rect.top + caret.top + caret.height, left: rect.left + caret.left });
  }

  function placeCaretAfterReplace(el: HTMLTextAreaElement, pos: number) {
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  // Replaces the textarea range [start, end) with the variable — literally
  // (`${path}`) or with its resolved value. `onDone` fires once applied.
  function applyInsertion(
    entry: VariableEntry,
    start: number,
    end: number,
    onDone?: () => void,
    contextOverride?: Partial<ResolveContext>,
  ) {
    const el = textareaRef.current;
    if (!el) return;

    if (mode === "literal") {
      const insertion = "${" + entry.path + "}";
      const next = el.value.slice(0, start) + insertion + el.value.slice(end);
      onReplace(next);
      placeCaretAfterReplace(el, start + insertion.length);
      onDone?.();
      return;
    }

    setLoading(true);
    fetch("/api/templates/resolve-variable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: entry.path, ...resolveContext, ...contextOverride }),
    })
      .then(async (r) => {
        if (!r.ok) {
          // Surface real backend errors instead of silently treating them as
          // "unresolved" — that only masks bugs (see e.g. the schema-drift
          // issues this app has already hit).
          console.error("[resolve-variable]", r.status, await r.text().catch(() => ""));
          return { value: null as string | null };
        }
        return r.json();
      })
      .catch((e) => {
        console.error("[resolve-variable]", e);
        return { value: null as string | null };
      })
      .then(({ value }: { value: string | null }) => {
        const insertion = value ?? "${" + entry.path + "}";
        if (value === null) onUnresolved?.([entry.path]);
        const current = el.value;
        const next = current.slice(0, start) + insertion + current.slice(end);
        onReplace(next);
        placeCaretAfterReplace(el, start + insertion.length);
      })
      .finally(() => {
        setLoading(false);
        onDone?.();
      });
  }

  // If `entry` needs a creator we don't have, opens an inline creator-pick
  // step in the same menu instead of resolving right away. Returns true when
  // it took over — the caller must not insert yet.
  function maybeRequestCreator(entry: VariableEntry, start: number, end: number): boolean {
    if (mode !== "resolve") return false;
    if (entry.group !== "creator") return false;
    if (resolveContext?.creatorId) return false;
    if (!creators || creators.length === 0) return false;

    openMenuAtCaret();
    setQuery("");
    setActiveIndex(0);
    setPendingCreatorPick({ entry, start, end });
    setOpen(true);
    return true;
  }

  function select(entry: VariableEntry) {
    const start = triggerStart.current;
    const end = start + 1 + query.length; // "/" + query
    if (maybeRequestCreator(entry, start, end)) return;
    applyInsertion(entry, start, end, closeMenu);
  }

  // Insert a variable by path at the current caret — the entry point for an
  // explicit "add variable" picker button (no `/query` to replace).
  function insertVariable(path: string) {
    const el = textareaRef.current;
    const entry = VARIABLE_MAP.get(path);
    if (!el || !entry) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (maybeRequestCreator(entry, start, end)) return;
    applyInsertion(entry, start, end);
  }

  // Resolves the variable that triggered the creator-pick step, using the
  // just-picked creator for this insertion only (per the product decision:
  // ask again for every creator variable, no session-wide memory).
  function pickCreatorForPending(creatorId: string) {
    if (!pendingCreatorPick) return;
    const { entry, start, end } = pendingCreatorPick;
    setPendingCreatorPick(null);
    applyInsertion(entry, start, end, closeMenu, { creatorId });
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const textBefore = el.value.slice(0, caret);

    if (open) {
      const slice = textBefore.slice(triggerStart.current);
      const match = slice.match(QUERY_RE);
      if (!match) {
        closeMenu();
        return;
      }
      setQuery(match[1]);
      setActiveIndex(0);
      return;
    }

    if (textBefore[caret - 1] !== "/") return;
    const before = textBefore[caret - 2];
    const atBoundary = caret === 1 || before === undefined || WORD_BOUNDARY_RE.test(before);
    if (!atBoundary) return;

    openMenuAt(caret - 1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!open) return false;
    const activeLength = pendingCreatorPick ? creatorItems.length : items.length;
    if (e.key === "Escape") {
      closeMenu();
      return true;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (activeLength ? (i + 1) % activeLength : 0));
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (activeLength ? (i - 1 + activeLength) % activeLength : 0));
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (pendingCreatorPick) {
        const creator = creatorItems[activeIndex];
        if (creator) pickCreatorForPending(creator.id);
        else closeMenu();
        return true;
      }
      const entry = items[activeIndex];
      if (entry) select(entry);
      else closeMenu();
      return true;
    }
    return false;
  }

  const menu = open
    ? createPortal(
        <div
          style={{ position: "fixed", top: position.top, left: position.left }}
          className="z-50 w-64 overflow-hidden rounded-lg bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {pendingCreatorPick && (
            <p className="border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Für welchen Creator? · {pendingCreatorPick.entry.label}
            </p>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {pendingCreatorPick ? (
              creatorItems.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Keine Creator gefunden.</p>
              ) : (
                creatorItems.map((creator, i) => (
                  <Button
                    key={creator.id}
                    type="button"
                    variant="ghost"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickCreatorForPending(creator.id);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={
                      "h-auto rounded-none flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted " +
                      (i === activeIndex ? "bg-muted" : "")
                    }
                  >
                    <span className="text-xs font-medium">{creator.full_name}</span>
                  </Button>
                ))
              )
            ) : loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Löse Variable auf…
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Keine Treffer.</p>
            ) : (
              items.map((entry, i) => (
                <Button
                  key={entry.path}
                  type="button"
                  variant="ghost"
                  onMouseDown={(e) => {
                    // preventDefault so the textarea never loses focus/selection
                    e.preventDefault();
                    select(entry);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={
                    "h-auto rounded-none flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted " +
                    (i === activeIndex ? "bg-muted" : "")
                  }
                >
                  <span className="text-xs font-medium">{entry.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {"${" + entry.path + "}"}
                  </span>
                </Button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return { menu, handleChange, handleKeyDown, insertVariable, loading };
}
