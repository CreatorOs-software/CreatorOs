"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  useContext,
  useId,
} from "react";
import { Pin, X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WIN_WIDTH = 440;
const WIN_HEIGHT = 520;

// ─── Context ─────────────────────────────────────────────────────────────────

interface FloatingWindowContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinned: boolean;
  setPinned: React.Dispatch<React.SetStateAction<boolean>>;
  position: { x: number; y: number };
  startDrag: (clientX: number, clientY: number) => void;
  windowRef: React.RefObject<HTMLDivElement | null>;
}

const FloatingWindowContext = createContext<FloatingWindowContextValue | null>(
  null,
);

function useFloatingWindow() {
  const ctx = useContext(FloatingWindowContext);
  if (!ctx)
    throw new Error("FloatingWindow.* must be used inside FloatingWindow.Root");
  return ctx;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface RootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPosition?: { x: number; y: number };
  children: React.ReactNode;
}

function Root({ open, onOpenChange, defaultPosition, children }: RootProps) {
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState(
    defaultPosition ?? { x: 120, y: 20 },
  );
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      dragState.current = {
        offsetX: clientX - position.x,
        offsetY: clientY - position.y,
      };
    },
    [position],
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.current) return;
    const { offsetX, offsetY } = dragState.current;
    const maxX = window.innerWidth - WIN_WIDTH;
    const maxY = window.innerHeight - WIN_HEIGHT;
    setPosition({
      x: Math.min(Math.max(0, e.clientX - offsetX), Math.max(0, maxX)),
      y: Math.min(Math.max(0, e.clientY - offsetY), Math.max(0, maxY)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // Outside click closes when not pinned
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (pinned) return;
      if (windowRef.current && !windowRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open, pinned, onOpenChange]);

  // Escape always closes
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  return (
    <FloatingWindowContext.Provider
      value={{
        open,
        onOpenChange,
        pinned,
        setPinned,
        position,
        startDrag,
        windowRef,
      }}
    >
      {children}
    </FloatingWindowContext.Provider>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

interface ContentProps {
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
}

function Content({ children, className, labelledBy }: ContentProps) {
  const { open, position, windowRef } = useFloatingWindow();
  if (!open) return null;

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelledBy}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg",
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
        width: WIN_WIDTH,
        height: WIN_HEIGHT,
        boxShadow:
          "0 1px 2px oklch(0 0 0 / 0.04), 0 16px 40px oklch(0 0 0 / 0.12)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  title: string;
}

function Header({ title }: HeaderProps) {
  const { startDrag, pinned, setPinned, onOpenChange } = useFloatingWindow();
  const titleId = useId();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="flex shrink-0 cursor-grab select-none items-center gap-2 border-b border-border bg-muted px-3 py-2.5 active:cursor-grabbing"
    >
      <GripHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
      <span
        id={titleId}
        className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-foreground"
      >
        {title}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-pressed={pinned}
        aria-label={pinned ? "Fenster lösen" : "Fenster anpinnen"}
        title={
          pinned
            ? "Angepinnt – bleibt beim Klicken außerhalb offen"
            : "Anpinnen"
        }
        className={cn(
          pinned && "bg-primary text-primary-foreground hover:bg-primary/80",
        )}
        onClick={() => setPinned((p) => !p)}
      >
        <Pin
          className={cn(
            "size-3.5 transition-transform",
            pinned ? "rotate-0" : "rotate-45",
          )}
        />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Fenster schließen"
        onClick={() => onOpenChange(false)}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────────

interface BodyProps {
  children: React.ReactNode;
  className?: string;
}

function Body({ children, className }: BodyProps) {
  return (
    <div className={cn("flex-1 overflow-auto p-4", className)}>{children}</div>
  );
}

// ─── Compound export ──────────────────────────────────────────────────────────

export const FloatingWindow = { Root, Content, Header, Body };
