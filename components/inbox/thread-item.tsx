"use client";

import { Archive, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Thread } from "./types";
import { formatDate, getDisplayName, getInitial, getSenderColor } from "./utils";

type Props = {
  thread: Thread;
  isSelected: boolean;
  onClick: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ThreadItem({ thread, isSelected, onClick, onStar, onArchive, onDelete }: Props) {
  const displayName = getDisplayName(thread.sender_name, thread.sender_email);
  const initial = getInitial(thread.sender_name, thread.sender_email);
  const avatarColor = getSenderColor(thread.sender_email);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative mx-2 flex cursor-pointer flex-col items-start overflow-clip rounded-lg border border-transparent px-4 py-3 text-left text-sm transition-all",
        "hover:bg-primary/5",
        isSelected && "border-border bg-primary/5",
      )}
    >
      <div className="flex w-full items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {initial}
          </div>
          {thread.unread && !isSelected && (
            <span className="border-background absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-[#006FFE]" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-sm", thread.unread && !isSelected ? "font-bold" : "font-medium")}>
                {displayName}
              </span>
              {thread.unread && !isSelected && (
                <span className="size-2 rounded bg-[#006FFE]" />
              )}
              {thread.starred && (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <span className="text-nowrap text-xs font-normal opacity-70 transition-opacity group-hover:opacity-0">
              {formatDate(thread.received_at)}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs font-medium opacity-80">{thread.subject}</p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{thread.preview}</p>
          {thread.labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {thread.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: label.color + "22", color: label.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-3 hidden flex-row gap-1 group-hover:flex">
        <button
          onClick={(e) => { e.stopPropagation(); onStar(); }}
          className="flex h-6 w-6 items-center justify-center rounded border border-[#E7E7E7] bg-white hover:bg-gray-100"
        >
          <Star className={cn("h-3 w-3", thread.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          className="flex h-6 w-6 items-center justify-center rounded border border-[#E7E7E7] bg-white hover:bg-gray-100"
        >
          <Archive className="text-muted-foreground h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-6 w-6 items-center justify-center rounded border border-[#FCCDD5] bg-[#FDE4E9] hover:bg-[#FDE4E9]/80"
        >
          <Trash2 className="h-3 w-3 text-[#F43F5E]" />
        </button>
      </div>
    </div>
  );
}
