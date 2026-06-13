"use client";

import { ChevronLeft, ChevronRight, Mail, MailOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  onPatch: (id: string, patch: Partial<Thread>) => void;
}

export function WorkPanel({
  selected,
  open,
  integrations,
  onToggle,
  onPatch,
}: WorkPanelProps) {
  return (
    <div
      className={cn(
        "shrink-0 flex flex-col bg-card rounded-2xl overflow-hidden transition-all duration-300",
        open ? "w-64" : "w-12",
      )}
    >
      <Button
        variant="ghost"
        onClick={onToggle}
        className={cn(
          "w-full h-auto flex items-center gap-2 px-3 py-4 border-b border-border-light shrink-0 rounded-none",
          open ? "justify-start" : "justify-center",
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
      </Button>

      {/* Collapsed: icon shortcuts */}
      {!open && selected && (
        <div className="flex flex-col items-center gap-1 py-3 px-1">
          <div className="w-5 h-px bg-border-light my-1" />
          {(["high", "med", "low"] as const).map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="icon"
              onClick={() => onPatch(selected.id, { priority: p })}
              className={cn(
                "rounded-xl text-xs font-bold",
                selected.priority === p
                  ? PRIORITY_COLOR[p]
                  : "text-muted-foreground",
              )}
              title={PRIORITY_FULL[p]}
            >
              {PRIORITY_LABEL[p]}
            </Button>
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

            <Button
              variant="ghost"
              onClick={() => onPatch(selected.id, { unread: !selected.unread })}
              className="h-auto justify-start gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground"
            >
              {selected.unread ? (
                <MailOpen className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {selected.unread
                ? "Als gelesen markieren"
                : "Als ungelesen markieren"}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Priorität
            </p>
            <div className="flex gap-1.5">
              {(["high", "med", "low"] as const).map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  onClick={() => onPatch(selected.id, { priority: p })}
                  className={cn(
                    "flex-1 h-auto text-xs py-1.5 rounded-xl border",
                    selected.priority === p
                      ? PRIORITY_COLOR[p] + " border-transparent font-medium"
                      : "border-border-light text-muted-foreground",
                  )}
                >
                  {PRIORITY_FULL[p]}
                </Button>
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
                <span className="font-medium">
                  {formatDate(selected.received_at)}
                </span>
              </div>
              {selected.integration_id && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">
                    Postfach
                  </span>
                  <span className="font-medium text-right truncate">
                    {integrations.find((i) => i.id === selected.integration_id)
                      ?.email ?? "—"}
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
