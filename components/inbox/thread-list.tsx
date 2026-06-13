"use client";

import { ArrowLeft, Inbox, RefreshCw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Thread, type Filter, type MailboxId, formatDate } from "./inbox-types";
import { Button } from "@/components/ui/button";

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
  const unreadCount = filtered.filter((t) => t.unread).length;

  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-border-light">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold flex-1 truncate">{activeLabel}</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-semibold bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSync}
            disabled={isFetching || integrationsCount === 0}
            className="text-muted-foreground disabled:opacity-40"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </Button>
        </div>

        {activeMailboxId !== "__sent__" && (
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {(["all", "unread", "starred"] as Filter[]).map((f) => (
              <Button
                key={f}
                variant="ghost"
                onClick={() => onSetFilter(f)}
                className={cn(
                  "flex-1 h-auto text-xs py-1 rounded-lg font-medium",
                  filter === f
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "Alle" : f === "unread" ? "Ungelesen" : "Markiert"}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 px-4 text-center">
            <Inbox className="w-8 h-8 opacity-20" />
            <p className="text-sm">Keine Nachrichten</p>
          </div>
        ) : (
          filtered.map((t) => (
            <Button
              key={t.id}
              variant="ghost"
              onClick={() => onSelectThread(t)}
              className={cn(
                "w-full h-auto flex-col items-start justify-start whitespace-normal px-4 py-3 border-b border-border-light/50 hover:bg-muted/50 group rounded-none",
                selectedId === t.id && "bg-muted",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <span
                  className={cn(
                    "text-sm truncate",
                    t.unread ? "font-semibold" : "font-medium",
                  )}
                >
                  {t.sender_name ?? t.sender_email}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {formatDate(t.received_at)}
                </span>
              </div>
              <div
                className={cn(
                  "text-xs truncate mb-0.5",
                  t.unread ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t.subject}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground truncate flex-1">
                  {t.preview}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {t.unread && (
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => onStar(t, e)}
                    className={cn(
                      "opacity-0 group-hover:opacity-100 transition-opacity rounded",
                      t.starred && "opacity-100",
                    )}
                  >
                    <Star
                      className={cn(
                        "w-3 h-3",
                        t.starred
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </Button>
                </div>
              </div>
            </Button>
          ))
        )}
      </div>
    </>
  );
}
