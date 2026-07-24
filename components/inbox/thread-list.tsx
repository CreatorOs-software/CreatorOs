"use client";

import { useState } from "react";
import { ArrowLeft, Inbox, RefreshCw, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Thread, type Filter, type MailboxId, formatDate, PRIORITY_COLOR, PRIORITY_LABEL } from "./inbox-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ThreadListProps {
  filtered: Thread[];
  selectedId: string | null;
  activeMailboxId: MailboxId | null;
  activeLabel: string;
  filter: Filter;
  isFetching: boolean;
  integrationsCount: number;
  onBack: () => void;
  onSync: () => void;
  onSelectThread: (t: Thread) => void;
  onStar: (t: Thread, e: React.MouseEvent) => void;
  onSetFilter: (f: Filter) => void;
}

export function ThreadList({
  filtered,
  selectedId,
  activeMailboxId,
  activeLabel,
  filter,
  isFetching,
  integrationsCount,
  onBack,
  onSync,
  onSelectThread,
  onStar,
  onSetFilter,
}: ThreadListProps) {
  const [search, setSearch] = useState("");
  const unreadCount = filtered.filter((t) => t.unread).length;

  const visible = search
    ? filtered.filter(
        (t) =>
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          (t.sender_name ?? t.sender_email).toLowerCase().includes(search.toLowerCase()) ||
          t.preview?.toLowerCase().includes(search.toLowerCase()),
      )
    : filtered;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border-light shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon-sm" onClick={onBack} className="text-muted-foreground shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold flex-1 truncate">{activeLabel}</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 leading-none shrink-0">
              {unreadCount}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSync}
            disabled={isFetching || integrationsCount === 0}
            className="text-muted-foreground disabled:opacity-40 shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>

        {/* Filter tabs */}
        {activeMailboxId !== "__sent__" && (
          <div className="flex items-center gap-1 mb-3">
            {(["all", "unread", "starred"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => onSetFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "Alle" : f === "unread" ? "Ungelesen" : "Markiert"}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="h-8 pl-8 pr-3 text-xs bg-muted border-0 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Thread items */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-4 text-center py-12">
            <Inbox className="w-8 h-8 opacity-20" />
            <p className="text-sm">{search ? "Keine Treffer" : "Keine Nachrichten"}</p>
          </div>
        ) : (
          visible.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectThread(t)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border-light/50 hover:bg-muted/40 transition-colors group",
                selectedId === t.id && "bg-muted",
              )}
            >
              {/* Row 1: sender + date */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className={cn("text-sm truncate", t.unread ? "font-semibold" : "font-medium")}>
                  {t.sender_name ?? t.sender_email}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(t.received_at)}</span>
              </div>

              {/* Row 2: subject */}
              <p className={cn("text-xs mb-1 truncate", t.unread ? "text-foreground font-medium" : "text-muted-foreground")}>
                {t.subject}
              </p>

              {/* Row 3: preview + badges */}
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground truncate flex-1">{t.preview}</p>
                <div className="flex items-center gap-1 shrink-0">
                  {t.priority && t.priority !== "low" && (
                    <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none", PRIORITY_COLOR[t.priority])}>
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                  )}
                  {t.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  <button
                    onClick={(e) => onStar(t, e)}
                    className={cn(
                      "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded",
                      t.starred && "opacity-100",
                    )}
                  >
                    <Star className={cn("w-3 h-3", t.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                  </button>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
