"use client";

import {
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type Thread,
  type Integration,
  type Creator,
  type MailboxId,
  mailboxInitials,
} from "./inbox-types";

function MailboxRow({
  icon,
  label,
  sub,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="w-full h-auto flex justify-start whitespace-normal gap-3 px-4 py-2.5 hover:bg-muted/50"
    >
      <span className="w-9 h-9 rounded-xl bg-sidebar flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </span>
      <div className="flex flex-col text-left min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {badge != null && badge > 0 && (
        <span className="text-[10px] font-semibold bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none shrink-0">
          {badge}
        </span>
      )}
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </Button>
  );
}

interface MailboxOverviewProps {
  integrations: Integration[];
  creators: Creator[];
  inboxThreads: Thread[];
  sentThreads: Thread[];
  starredThreads: Thread[];
  totalUnread: number;
  isFetching: boolean;
  loading: boolean;
  onSync: () => void;
  onOpenMailbox: (id: MailboxId) => void;
}

export function MailboxOverview({
  integrations,
  creators,
  inboxThreads,
  sentThreads,
  starredThreads,
  totalUnread,
  isFetching,
  loading,
  onSync,
  onOpenMailbox,
}: MailboxOverviewProps) {
  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-border-light flex items-center justify-between">
        <span className="text-sm font-semibold">Postfächer</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onSync}
          disabled={isFetching || integrations.length === 0}
          className="text-muted-foreground disabled:opacity-40"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isFetching && "animate-spin")}
          />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : integrations.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          <p className="mb-2">Kein Postfach verbunden.</p>
          <a href="/integrations" className="underline underline-offset-2">
            Jetzt verbinden →
          </a>
        </div>
      ) : (
        integrations.map((integ) => {
          const unread = inboxThreads.filter(
            (t) => t.integration_id === integ.id && t.unread,
          ).length;
          const linkedCreator = integ.creator_id
            ? (creators.find((c) => c.id === integ.creator_id) ?? null)
            : null;
          const displayName =
            linkedCreator?.full_name ?? integ.display_name ?? integ.email;
          const initials =
            linkedCreator?.initials ?? mailboxInitials(integ.email);
          const avatarBg = linkedCreator?.color ?? undefined;
          return (
            <Button
              key={integ.id}
              variant="ghost"
              onClick={() => onOpenMailbox(integ.id)}
              className="w-full h-auto flex justify-start whitespace-normal gap-3 px-4 py-2.5 hover:bg-muted/50"
            >
              <span
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                  avatarBg ? "text-white" : "bg-sidebar text-muted-foreground",
                )}
                style={avatarBg ? { background: avatarBg } : undefined}
              >
                {initials}
              </span>
              <div className="flex flex-col text-left min-w-0">
                <div className="text-sm font-medium truncate">
                  {displayName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {integ.email}
                </div>
              </div>
              {unread > 0 && (
                <span className="text-[10px] font-semibold bg-yellow-400 text-black rounded-full px-1.5 py-0.5 leading-none shrink-0">
                  {unread}
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </Button>
          );
        })
      )}

      {integrations.length > 0 && (
        <div className="mx-4 my-2 h-px bg-border-light" />
      )}

      <div className="flex-1 overflow-y-auto py-1">
        <MailboxRow
          icon={<Inbox className="w-4 h-4" />}
          label="Alle Postfächer"
          sub={`${integrations.length} Postfach${integrations.length !== 1 ? "fächer" : ""}`}
          badge={totalUnread}
          onClick={() => onOpenMailbox("__all__")}
        />
        <MailboxRow
          icon={<Send className="w-4 h-4" />}
          label="Gesendet"
          sub={`${sentThreads.length} Nachricht${sentThreads.length !== 1 ? "en" : ""}`}
          onClick={() => onOpenMailbox("__sent__")}
        />
        <MailboxRow
          icon={<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
          label="Markiert"
          sub={`${starredThreads.length} Nachricht${starredThreads.length !== 1 ? "en" : ""}`}
          onClick={() => onOpenMailbox("__starred__")}
        />
      </div>
    </>
  );
}
