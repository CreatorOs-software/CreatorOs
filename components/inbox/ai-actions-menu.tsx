"use client";

import { Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Noch ohne Funktionalität – die Aktionen werden später verdrahtet.
const AI_ACTIONS = [
  "Rechtschreibung und Grammatik Korrigieren",
  "Als Vorlage speichern",
  "Kontextbezogene Antwort liefern",
] as const;

export function AiActionsMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand outline-none transition-colors hover:bg-brand/15",
          className,
        )}
      >
        <Sparkles className="h-3 w-3" />
        KI
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {AI_ACTIONS.map((label) => (
          <DropdownMenuItem key={label}>{label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
