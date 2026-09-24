"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  Skeleton,
} from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { InboxPageData } from "@/domains/communication";

const DISPLAY_LIMIT = 5;

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} h`;
  const d = Math.round(h / 24);
  return `vor ${d} T`;
}

interface KiAnfragenCardProps {
  className?: string;
}

export function KiAnfragenCard({ className }: KiAnfragenCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery<InboxPageData>({
    queryKey: QueryKeys.inbox.aiRequests(),
    queryFn: () =>
      fetch("/api/inbox?folder=INBOX&category=anfrage&request_status=open").then((r) =>
        r.json(),
      ),
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });

  const threads = data?.threads ?? [];
  const integrations = data?.integrations ?? [];
  const creators = data?.creators ?? [];
  const visible = threads.slice(0, DISPLAY_LIMIT);

  function creatorNamesFor(thread: InboxPageData["threads"][number]): string[] {
    const matchedNames = (thread.creator_matches ?? [])
      .filter((match) => match.relation !== "mentioned")
      .sort((a, b) => b.confidence - a.confidence)
      .map((match) => creators.find((creator) => creator.id === match.creator_id)?.full_name)
      .filter((name): name is string => Boolean(name));
    if (matchedNames.length > 0) return [...new Set(matchedNames)];

    const integrationId = thread.integration_id;
    const integration = integrations.find((i) => i.id === integrationId);
    const creator = integration?.creator_id
      ? creators.find((c) => c.id === integration.creator_id)
      : null;
    return creator ? [creator.full_name] : [];
  }

  function structureLabel(thread: InboxPageData["threads"][number]): string | null {
    if (thread.request_structure === "multiple_distinct_requests") return "Getrennte Briefings";
    if (thread.request_structure === "single_request_multiple_creators") return "Gemeinsame Anfrage";
    return null;
  }

  async function markRead(threadId: string) {
    const res = await fetch(`/api/inbox/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unread: false }),
    });
    if (!res.ok) return;
    queryClient.setQueryData<InboxPageData>(
      QueryKeys.inbox.aiRequests(),
      (old) =>
        old
          ? {
              ...old,
              threads: old.threads.map((thread) =>
                thread.id === threadId ? { ...thread, unread: false } : thread,
              ),
            }
          : old,
    );
  }

  return (
    <Card className={cn("flex h-full min-h-0 flex-col gap-4 overflow-hidden p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Anfragen</p>
        <Badge variant="default">
          KI Extrahiert <Sparkles />
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Keine neuen Anfragen 🎉
          </p>
        ) : (
          <Accordion type="multiple" className="flex flex-col">
            {visible.map((thread) => {
              const creatorNames = creatorNamesFor(thread);
              const structure = structureLabel(thread);
              const status = thread.deal_id
                ? "Verknüpfter Deal"
                : thread.anfrage_id
                  ? "Bestehende Anfrage"
                  : "Neue Anfrage";
              return (
                <AccordionItem key={thread.id} value={thread.id}>
                <AccordionTrigger>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">
                      {thread.subject}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelative(thread.received_at)}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2.5 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Absender (Brand)
                      </p>
                      <p className="truncate">
                        {thread.sender_name ?? thread.sender_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <p>{status}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Creator
                      </p>
                      <div className="mt-(--tui-space-3xs) flex flex-wrap gap-(--tui-space-3xs)">
                        {creatorNames.length > 0 ? creatorNames.map((name) => (
                          <Badge key={name} variant="outline">{name}</Badge>
                        )) : (
                          <span>Noch nicht zugeordnet</span>
                        )}
                      </div>
                      {structure && (
                        <p className="mt-(--tui-space-3xs) text-xs text-muted-foreground">
                          {structure}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!thread.unread}
                      onClick={() => markRead(thread.id)}
                    >
                      {thread.unread ? "Als gelesen markieren" : "Gelesen"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/inbox?thread=${thread.id}&integration_id=${thread.integration_id}`,
                        )
                      }
                    >
                      Zur Email
                    </Button>
                  </div>
                </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {threads.length > DISPLAY_LIMIT && (
        <button
          type="button"
          onClick={() => router.push("/inbox?category=anfrage")}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 self-start"
        >
          Alle anzeigen ({threads.length})
        </button>
      )}
    </Card>
  );
}
