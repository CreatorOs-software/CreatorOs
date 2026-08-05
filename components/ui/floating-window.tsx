"use client";

import React from "react";
import { FloatingPanel } from "@ark-ui/react/floating-panel";
import { Portal } from "@ark-ui/react/portal";
import { ArrowDownLeft, ArrowLeft, GripHorizontal, Maximize2, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Shared button style for header controls ───────────────────────────────────

const ctrlCls =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/8 hover:text-foreground";

// ─── Root ─────────────────────────────────────────────────────────────────────

interface RootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  children: React.ReactNode;
}

function Root({ open, onOpenChange, defaultPosition, defaultSize, children }: RootProps) {
  return (
    <FloatingPanel.Root
      open={open}
      onOpenChange={(d) => onOpenChange(d.open)}
      defaultPosition={defaultPosition ?? { x: 120, y: 80 }}
      defaultSize={defaultSize ?? { width: 440, height: 520 }}
      minSize={{ width: 320, height: 380 }}
    >
      <Portal>
        <FloatingPanel.Positioner style={{ zIndex: 50 }}>
          <FloatingPanel.Content
            className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg data-maximized:rounded-none"
            style={{
              boxShadow: "0 1px 2px oklch(0 0 0 / 0.04), 0 16px 40px oklch(0 0 0 / 0.12)",
            }}
          >
            {children}

            {/* Resize handles */}
            <FloatingPanel.ResizeTrigger axis="n" className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize opacity-0" />
            <FloatingPanel.ResizeTrigger axis="e" className="absolute top-2 right-0 bottom-2 w-1.5 cursor-e-resize opacity-0" />
            <FloatingPanel.ResizeTrigger axis="w" className="absolute top-2 left-0 bottom-2 w-1.5 cursor-w-resize opacity-0" />
            <FloatingPanel.ResizeTrigger axis="s" className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize opacity-0" />
            <FloatingPanel.ResizeTrigger axis="ne" className="absolute top-0 right-0 size-3 cursor-ne-resize opacity-0" />
            <FloatingPanel.ResizeTrigger axis="se" className="absolute bottom-0 right-0 size-3 cursor-se-resize opacity-0" />
            <FloatingPanel.ResizeTrigger axis="sw" className="absolute bottom-0 left-0 size-3 cursor-sw-resize opacity-0" />
            <FloatingPanel.ResizeTrigger axis="nw" className="absolute top-0 left-0 size-3 cursor-nw-resize opacity-0" />
          </FloatingPanel.Content>
        </FloatingPanel.Positioner>
      </Portal>
    </FloatingPanel.Root>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

interface ContentProps {
  children: React.ReactNode;
  className?: string;
}

function Content({ children }: ContentProps) {
  return <>{children}</>;
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
  onBack?: () => void;
}

function Header({ title, className, children, onBack }: HeaderProps) {
  const headerEl = (
    <FloatingPanel.Header
      className={cn(
        "flex shrink-0 select-none items-center gap-2 border-b border-border bg-muted px-3 py-2.5",
        !onBack && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {onBack ? (
        <button type="button" onClick={onBack} className={ctrlCls} aria-label="Zurück">
          <ArrowLeft className="size-3.5" />
        </button>
      ) : (
        <GripHorizontal className="size-3.5 shrink-0 text-muted-foreground/60" />
      )}

      <FloatingPanel.Title className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-foreground">
        {title}
      </FloatingPanel.Title>

      {children}

      <FloatingPanel.Control className="flex items-center gap-0.5">
        {!onBack && (
          <>
            <FloatingPanel.StageTrigger stage="minimized" className={ctrlCls}>
              <Minus className="size-3.5" />
            </FloatingPanel.StageTrigger>
            <FloatingPanel.StageTrigger stage="maximized" className={ctrlCls}>
              <Maximize2 className="size-3.5" />
            </FloatingPanel.StageTrigger>
            <FloatingPanel.StageTrigger stage="default" className={ctrlCls}>
              <ArrowDownLeft className="size-3.5" />
            </FloatingPanel.StageTrigger>
          </>
        )}
        <FloatingPanel.CloseTrigger className={cn(ctrlCls, "hover:bg-red-50 hover:text-red-600")}>
          <X className="size-3.5" />
        </FloatingPanel.CloseTrigger>
      </FloatingPanel.Control>
    </FloatingPanel.Header>
  );

  if (onBack) return headerEl;

  return (
    <FloatingPanel.DragTrigger>
      {headerEl}
    </FloatingPanel.DragTrigger>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────────

interface BodyProps {
  children: React.ReactNode;
  className?: string;
}

function Body({ children, className }: BodyProps) {
  return (
    <FloatingPanel.Body className={cn("flex-1 overflow-auto p-4", className)}>
      {children}
    </FloatingPanel.Body>
  );
}

// ─── Compound export ──────────────────────────────────────────────────────────

export const FloatingWindow = { Root, Content, Header, Body };
