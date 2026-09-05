"use client";

import { Loader2, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AiActionsMenuProps = {
  className?: string;
  /** A KI action is running — disables the menu and shows a spinner. */
  busy?: boolean;
  /** Wired: streams a spell/grammar-corrected draft back into the composer. */
  onCorrectSpelling?: () => void;
};

export function AiActionsMenu({
  className,
  busy = false,
  onCorrectSpelling,
}: AiActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand outline-none transition-colors hover:bg-brand/15 disabled:opacity-60",
          className,
        )}
      >
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        KI
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          disabled={!onCorrectSpelling || busy}
          onClick={() => onCorrectSpelling?.()}
        >
          Rechtschreibung und Grammatik Korrigieren
        </DropdownMenuItem>
        {/* Noch ohne Funktionalität */}
        <DropdownMenuItem disabled>Als Vorlage speichern</DropdownMenuItem>
        <DropdownMenuItem disabled>Kontextbezogene Antwort liefern</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
