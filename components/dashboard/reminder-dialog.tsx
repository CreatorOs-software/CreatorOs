"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MessageCircle, Send } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
} from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import type { WhatsAppConnectionPublic } from "@/domains/whatsapp/types";

interface ReminderDialogProps {
  creatorId: string;
  creatorName: string;
  defaultMessage: string;
}

export function ReminderDialog({ creatorId, creatorName, defaultMessage }: ReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: connData } = useQuery<{ connection: WhatsAppConnectionPublic }>({
    queryKey: QueryKeys.whatsapp.connection(),
    queryFn: () => fetch("/api/admin/whatsapp").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  const connected = connData?.connection?.connected === true;

  async function send() {
    if (!message.trim() || !connected || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, body: message.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Senden fehlgeschlagen");
        return;
      }
      toast.success(`Erinnerung an ${creatorName} gesendet.`);
      setOpen(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setMessage(defaultMessage);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
          title={`Erinnerung an ${creatorName} senden`}
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Erinnerung an {creatorName}</DialogTitle>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError(null);
          }}
          rows={5}
          className="text-sm"
          placeholder="Nachricht …"
        />

        <p className="text-[11px] text-muted-foreground">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : !connected ? (
            <>
              Kein WhatsApp-Absender verbunden.{" "}
              <Link
                href="/admin/settings/integrations"
                className="underline hover:text-foreground"
              >
                In den Einstellungen verbinden
              </Link>
            </>
          ) : (
            <>Geht per WhatsApp an {creatorName}.</>
          )}
        </p>

        <DialogFooter>
          <Button
            className="gap-1.5"
            disabled={!message.trim() || !connected || sending}
            onClick={send}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sending ? "Sendet…" : "Erinnerung senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
