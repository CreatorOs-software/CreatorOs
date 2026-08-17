"use client";

import { Archive, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoMessage } from "./types";
import { formatDate, getInitial } from "./utils";

type Props = {
  message: DemoMessage;
  isSelected: boolean;
  onClick: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ThreadItem({ message, isSelected, onClick, onStar, onArchive, onDelete }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative mx-2 flex cursor-pointer flex-col items-start overflow-clip rounded-lg border border-transparent px-4 py-3 text-left text-sm transition-all hover:opacity-100",
        "hover:bg-primary/5",
        isSelected && "border-border bg-primary/5 opacity-100",
      )}
    >
      <div className="flex w-full items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="bg-muted-foreground/20 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
            {getInitial(message.sender.name)}
          </div>
          {message.unread && !isSelected && (
            <span className="border-background absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-[#006FFE]" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-sm", message.unread && !isSelected ? "font-bold" : "font-medium")}>
                {message.sender.name}
              </span>
              {message.unread && !isSelected && (
                <span className="size-2 rounded bg-[#006FFE]" />
              )}
            </div>
            <span className="text-nowrap text-xs font-normal opacity-70 transition-opacity group-hover:opacity-0">
              {formatDate(message.receivedOn)}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs opacity-70">{message.subject}</p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{message.body}</p>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-3 hidden flex-row gap-1 group-hover:flex">
        <button
          onClick={(e) => { e.stopPropagation(); onStar(); }}
          className="flex h-6 w-6 items-center justify-center rounded border border-[#E7E7E7] bg-white hover:bg-gray-100"
        >
          <Star className={cn("h-3 w-3", message.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
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
