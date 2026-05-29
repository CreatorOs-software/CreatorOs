"use client";

import { ChevronLeft, ChevronRight, Mail, MailOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Thread,
  type Integration,
  PRIORITY_COLOR,
  PRIORITY_FULL,
  PRIORITY_LABEL,
  formatDate,
} from "./inbox-types";

interface WorkPanelProps {
  selected: Thread | null;
  open: boolean;
  integrations: Integration[];
  onToggle: () => void;
  onStar: (t: Thread) => void;
  onPatch: (id: string, patch: Partial<Thread>) => void;
}

export function WorkPanel({
  selected,
  open,
  integrations,
  onToggle,
  onStar,
  onPatch,
}: WorkPanelProps) {
  return (
    <div
      className={cn(
        "shrink-0 flex flex-col bg-card rounded-2xl overflow-hidden transition-all duration-300",
        open ? "w-64" : "w-12",
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-3 py-4 border-b border-border-light hover:bg-muted transition-colors w-full shrink-0",
          !open && "justify-center",
        )}
      >
        {open ? (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Work Panel
            </span>
          </>
        ) : (
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsed: icon shortcuts */}
      {!open && selected && (
        <div className="flex flex-col items-center gap-1 py-3 px-1">
          <button
            onClick={() => onStar(selected)}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              selected.starred
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-muted-foreground hover:bg-muted",
            )}
            title="Markieren"
          >
            <Star className={cn("w-4 h-4", selected.starred && "fill-yellow-400")} />
          </button>
          <button
            onClick={() => onPatch(selected.id, { unread: !selected.unread })}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            title={selected.unread ? "Als gelesen markieren" : "Als ungelesen markieren"}
          >
            {selected.unread ? (
              <MailOpen className="w-4 h-4" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
          </button>
          <div className="w-5 h-px bg-border-light my-1" />
          {(["high", "med", "low"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPatch(selected.id, { priority: p })}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-colors",
                selected.priority === p
                  ? PRIORITY_COLOR[p]
                  : "text-muted-foreground hover:bg-muted",
              )}
              title={PRIORITY_FULL[p]}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
        </div>
      )}

      {/* Expanded content */}
      {open && selected && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Aktionen
            </p>
            <button
              onClick={() => onStar(selected)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
                selected.starred
                  ? "bg-yellow-400/10 text-yellow-600"
                  : "hover:bg-muted text-muted-foreground",
              )}
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  selected.starred && "fill-yellow-400 text-yellow-400",
                )}
              />
              {selected.starred ? "Markierung entfernen" : "Markieren"}
            </button>
            <button
              onClick={() => onPatch(selected.id, { unread: !selected.unread })}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-muted text-muted-foreground transition-colors"
            >
              {selected.unread ? (
                <MailOpen className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {selected.unread ? "Als gelesen markieren" : "Als ungelesen markieren"}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Priorität
            </p>
            <div className="flex gap-1.5">
              {(["high", "med", "low"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => onPatch(selected.id, { priority: p })}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-xl border transition-colors",
                    selected.priority === p
                      ? PRIORITY_COLOR[p] + " border-transparent font-medium"
                      : "border-border-light text-muted-foreground hover:bg-muted",
                  )}
                >
                  {PRIORITY_FULL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Details
            </p>
            <div className="bg-muted/50 rounded-xl p-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Von</span>
                <span className="font-medium text-right truncate">
                  {selected.sender_name ?? selected.sender_email}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">E-Mail</span>
                <span className="font-medium text-right truncate">
                  {selected.sender_email}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Datum</span>
                <span className="font-medium">{formatDate(selected.received_at)}</span>
              </div>
              {selected.integration_id && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Postfach</span>
                  <span className="font-medium text-right truncate">
                    {integrations.find((i) => i.id === selected.integration_id)?.email ??
                      "—"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {open && !selected && (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Keine Nachricht ausgewählt
          </p>
        </div>
      )}
    </div>
  );
}
