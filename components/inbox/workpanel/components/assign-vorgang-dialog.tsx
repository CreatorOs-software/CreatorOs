"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import type { Anfrage } from "@/domains/anfragen";
import type { DealFull } from "@/domains/deals";
import type { Creator } from "../../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  creators: Creator[];
};

const money = (n: number) => n.toLocaleString("de-DE") + " €";

export function AssignVorgangDialog({ open, onOpenChange, threadId, creators }: Props) {
  const [creatorId, setCreatorId] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: anfragenData, isLoading: anfragenLoading } = useQuery<{ anfragen: Anfrage[] }>({
    queryKey: QueryKeys.creators.anfragen(creatorId),
    queryFn: () => fetch(`/api/creators/${creatorId}/anfragen`).then((r) => r.json()),
    enabled: !!creatorId,
  });
  const { data: dealsData, isLoading: dealsLoading } = useQuery<{ deals: DealFull[] }>({
    queryKey: QueryKeys.creators.deals(creatorId),
    queryFn: () => fetch(`/api/creators/${creatorId}/deals`).then((r) => r.json()),
    enabled: !!creatorId,
  });
  const anfragen = anfragenData?.anfragen ?? [];
  const deals = dealsData?.deals ?? [];

  function reset() {
    setCreatorId("");
    setLinkingId(null);
  }

  async function link(kind: "anfrage" | "deal", id: string) {
    setLinkingId(id);
    try {
      const res = await fetch(`/api/inbox/${threadId}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "anfrage" ? { anfrage_id: id } : { deal_id: id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Verknüpfung fehlgeschlagen");
      }
      await queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.all() });
      toast.success(kind === "anfrage" ? "Mit Anfrage verknüpft" : "Mit Deal verknüpft");
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verknüpfung fehlgeschlagen");
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-sm">Zu bestehendem Vorgang zuordnen</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <Select value={creatorId} onValueChange={(v) => v !== null && setCreatorId(v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Creator wählen…" />
            </SelectTrigger>
            <SelectContent>
              {creators.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {creatorId && (
            <>
              <section className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Anfragen
                </p>
                {anfragenLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : anfragen.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Keine Anfragen für diesen Creator.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {anfragen.map((a) => (
                      <Button
                        key={a.id}
                        type="button"
                        variant="outline"
                        disabled={linkingId !== null}
                        onClick={() => link("anfrage", a.id)}
                        className="h-auto flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left"
                      >
                        <span className="text-xs font-medium">
                          {a.brands?.company_name ?? a.brand_name ?? "Unbekannte Brand"}
                        </span>
                        {a.title && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {a.title}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Deals
                </p>
                {dealsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : deals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Keine Deals für diesen Creator.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {deals.map((d) => (
                      <Button
                        key={d.id}
                        type="button"
                        variant="outline"
                        disabled={linkingId !== null}
                        onClick={() => link("deal", d.id)}
                        className="h-auto flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left"
                      >
                        <span className="text-xs font-medium">
                          {d.brands?.company_name ?? "Unbekannte Brand"} – {d.title}
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {money(d.budget)}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
