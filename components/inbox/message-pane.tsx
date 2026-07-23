"use client";

import {
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Send,
  Star,
  Trash2,
  Archive,
} from "lucide-react";
import { type Thread, formatFullDate, mailboxInitials } from "./inbox-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  const initials = selected
    ? (selected.sender_name ? mailboxInitials(selected.sender_name) : mailboxInitials(selected.sender_email))
    : "";

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-card rounded-2xl overflow-hidden">
      {selected ? (
        <>
          {/* Toolbar */}
          <div className="px-4 py-2.5 border-b border-border-light flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              title="Archivieren"
            >
              <Archive className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-border-light mx-1" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onStar(selected)}
              className={cn(
                "text-muted-foreground",
                selected.starred && "text-yellow-400",
              )}
              title="Markieren"
            >
              <Star className={cn("w-4 h-4", selected.starred && "fill-yellow-400")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPatch(selected.id, { unread: !selected.unread })}
              className="text-muted-foreground"
              title={selected.unread ? "Als gelesen markieren" : "Als ungelesen markieren"}
            >
              {selected.unread ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </Button>
          </div>

          {/* Email header */}
          <div className="px-6 py-4 border-b border-border-light shrink-0">
            <div className="flex items-start gap-3">
              {/* Sender avatar */}
              <div
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 mt-0.5"
              >
                {initials}
              </div>

              {/* Sender info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold leading-snug">
                      {selected.sender_name ?? selected.sender_email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {selected.subject}
                    </p>
                    {selected.sender_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reply-To: {selected.sender_email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {formatFullDate(selected.received_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
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

          {/* Reply composer */}
          {selected.folder !== "sent" && (
            <div className="border-t border-border-light shrink-0">
              <Textarea
                ref={replyRef}
                value={reply}
                onChange={(e) => onReplyChange(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSend();
                }}
                placeholder={`Antwort an ${selected.sender_name ?? selected.sender_email}…`}
                className="resize-none border-0 focus-visible:ring-0 rounded-none min-h-20 px-6 py-4 text-sm bg-transparent"
              />
              <div className="px-4 py-3 flex items-center justify-between border-t border-border-light">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    className="w-8 h-4 bg-muted rounded-full relative transition-colors cursor-pointer"
                    title="Thread stummschalten"
                  >
                    <div className="w-3 h-3 bg-background rounded-full absolute top-0.5 left-0.5 shadow-sm" />
                  </div>
                  <span className="text-xs text-muted-foreground">Thread stummschalten</span>
                </label>
                <Button
                  onClick={onSend}
                  disabled={!reply.trim() || sending}
                  className="gap-1.5 h-8 text-sm px-4"
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
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Inbox className="w-10 h-10 opacity-20" />
          <p className="text-sm">Keine Nachricht ausgewählt</p>
        </div>
      )}
    </div>
  );
}
