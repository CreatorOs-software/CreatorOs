"use client";

import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Copy,
  Forward,
  Inbox,
  MoreHorizontal,
  Reply,
  ReplyAll,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DemoMessage } from "./types";
import { TAG_COLORS } from "./constants";
import { formatDate, getInitial } from "./utils";

type EmailDetailPanelProps = {
  message: DemoMessage;
  messages: DemoMessage[];
  selectedIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStar: () => void;
  onDelete: () => void;
};

export function EmailDetailPanel({
  message,
  messages,
  selectedIndex,
  onClose,
  onPrev,
  onNext,
  onStar,
  onDelete,
}: EmailDetailPanelProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center justify-between border-b border-[#E7E7E7] px-4 py-2">
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <button
            onClick={onPrev}
            disabled={selectedIndex <= 0}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onNext}
            disabled={selectedIndex >= messages.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <Copy className="text-muted-foreground h-4 w-4" />
          </button>
          <button onClick={onStar} className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <Star className={cn("h-4 w-4", message.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <Archive className="text-muted-foreground h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded border border-[#FCCDD5] bg-[#FDE4E9] hover:bg-[#FDE4E9]/80"
          >
            <Trash2 className="h-4 w-4 text-[#F43F5E]" />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted">
            <MoreHorizontal className="text-muted-foreground h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pb-4">
          <h2 className="text-xl font-semibold leading-snug">{message.title}</h2>

          {/* Tag chips */}
          {message.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {message.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium",
                    TAG_COLORS[tag.id] ?? "border bg-muted text-muted-foreground",
                  )}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Summary box */}
          <div className="mt-4 rounded-lg border border-[#006FFE]/30 bg-[#006FFE]/5 p-3">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#006FFE]">
              Summary <span className="font-normal opacity-60">↑</span>
            </p>
            <p className="text-sm text-muted-foreground">{message.body}</p>
          </div>

          {/* Message */}
          <div className="mt-6">
            <div className="flex items-start gap-3">
              <div className="bg-muted-foreground/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                {getInitial(message.sender.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{message.sender.name}</span>
                    <Popover>
                      <PopoverTrigger className="cursor-pointer border-0 bg-transparent p-0 text-xs text-[#006FFE] hover:underline">
                        Details
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start" className="w-72 p-3">
                        <div className="flex flex-col gap-2 text-xs">
                          <div className="flex gap-2">
                            <span className="w-12 shrink-0 text-muted-foreground">From</span>
                            <span className="truncate font-medium">
                              {message.sender.name} &lt;{message.sender.email}&gt;
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-12 shrink-0 text-muted-foreground">To</span>
                            <span className="font-medium">You</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-12 shrink-0 text-muted-foreground">Date</span>
                            <span className="font-medium">{formatDate(message.receivedOn)}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(message.receivedOn)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">To: You</p>
              </div>
            </div>

            <div
              className="prose prose-sm mt-5 max-w-none text-foreground [&_a]:text-foreground [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: message.decodedBody }}
            />

            {/* Reply / Reply All / Forward buttons */}
            {!replyOpen && (
              <div className="mt-8 flex flex-wrap gap-2">
                {(
                  [
                    { icon: <Reply className="h-4 w-4" />, label: "Reply", shortcut: "r", action: () => setReplyOpen(true) },
                    { icon: <ReplyAll className="h-4 w-4" />, label: "Reply All", shortcut: "a", action: () => setReplyOpen(true) },
                    { icon: <Forward className="h-4 w-4" />, label: "Forward", shortcut: "f", action: () => {} },
                  ] as const
                ).map(({ icon, label, shortcut, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex items-center gap-2 rounded-lg border border-[#E7E7E7] bg-white px-3 py-2 text-sm hover:bg-muted"
                  >
                    {icon}
                    <span>{label}</span>
                    <kbd className="rounded border border-[#E7E7E7] bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                      {shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            )}

            {/* Inline reply composer */}
            {replyOpen && (
              <div className="mt-6 rounded-xl border border-[#E7E7E7]">
                <div className="flex items-center gap-2 border-b border-[#E7E7E7] px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">
                    Reply to{" "}
                    <span className="font-medium text-foreground">{message.sender.name}</span>
                  </span>
                </div>
                <textarea
                  autoFocus
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply…"
                  className="min-h-24 w-full resize-none bg-transparent px-4 py-3 text-sm outline-none"
                />
                <div className="flex items-center justify-between border-t border-[#E7E7E7] px-4 py-2">
                  <button
                    onClick={() => setReplyOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!reply.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-40"
                  >
                    <Reply className="h-3 w-3" />
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Inbox className="h-6 w-6 opacity-40" />
      </div>
      <p className="text-sm">Select a message to read</p>
    </div>
  );
}
