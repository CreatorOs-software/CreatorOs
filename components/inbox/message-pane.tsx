"use client";

import {
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Reply,
  Send,
  Star,
} from "lucide-react";
import { type Thread, formatFullDate } from "./inbox-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MessagePaneProps {
  selected: Thread | null;
  reply: string;
  sending: boolean;
  replyRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: () => void;
  onPatch: (id: string, patch: Partial<Thread>) => void;
  onStar: (t: Thread) => void;
  onReplyChange: (value: string) => void;
}

export function MessagePane({
  selected,
  reply,
  sending,
  replyRef,
  onSend,
  onPatch,
  onStar,
  onReplyChange,
}: MessagePaneProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3">
      {/* Message body */}
      <div className="flex-1 min-h-0 bg-card rounded-2xl flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="px-6 py-4 border-b border-border-light shrink-0">
              <div className="flex justify-between items-center ">
                <h2 className="text-base font-semibold mb-1 leading-snug">
                  {selected.subject}
                </h2>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onStar(selected)}
                    className={cn(
                      "rounded-xl",
                      selected.starred
                        ? "text-yellow-400 bg-yellow-400/10"
                        : "text-muted-foreground",
                    )}
                    title="Markieren"
                  >
                    <Star
                      className={cn(
                        "w-4 h-4",
                        selected.starred && "fill-yellow-400",
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      onPatch(selected.id, { unread: !selected.unread })
                    }
                    className="rounded-xl text-muted-foreground"
                    title={
                      selected.unread
                        ? "Als gelesen markieren"
                        : "Als ungelesen markieren"
                    }
                  >
                    {selected.unread ? (
                      <MailOpen className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selected.sender_name ?? selected.sender_email}
                </span>
                {selected.sender_name && (
                  <span className="text-xs">
                    &lt;{selected.sender_email}&gt;
                  </span>
                )}
                <span className="ml-auto text-xs">
                  {formatFullDate(selected.received_at)}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {selected.body_html ? (
                <div
                  className="prose prose-sm max-w-none text-foreground [&_a]:text-foreground [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: selected.body_html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                  {selected.body ?? selected.preview ?? ""}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Inbox className="w-10 h-10 opacity-20" />
            <p className="text-sm">Keine Nachricht ausgewählt</p>
          </div>
        )}
      </div>

      {/* Reply composer */}
      {selected && selected.folder !== "sent" && (
        <div className="bg-card rounded-2xl shrink-0">
          <div className="px-4 py-2.5 border-b border-border-light flex items-center gap-2">
            <Reply className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Antwort an{" "}
              <span className="text-foreground">{selected.sender_email}</span>
            </span>
          </div>
          <div className="p-3">
            <textarea
              ref={replyRef}
              value={reply}
              onChange={(e) => onReplyChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSend();
              }}
              placeholder="Antwort schreiben… (⌘+Enter senden)"
              rows={4}
              className="w-full resize-none text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="ghost"
                onClick={onSend}
                disabled={!reply.trim() || sending}
                className="h-auto gap-1.5 text-sm px-4 py-1.5 rounded-xl bg-yellow-400 text-black font-medium hover:bg-yellow-300 hover:text-black disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {sending ? "Senden…" : "Senden"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
