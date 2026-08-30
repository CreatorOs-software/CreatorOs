"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Inbox, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryKeys } from "@/lib/query-keys";
import type { WhatsAppConnectionPublic } from "@/domains/whatsapp";

// ─── WhatsApp panel ──────────────────────────────────────────────────────────

function WhatsAppPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ connection: WhatsAppConnectionPublic }>({
    queryKey: QueryKeys.whatsapp.connection(),
    queryFn: () => fetch("/api/admin/whatsapp").then((r) => r.json()),
  });
  const connection = data?.connection;

  const [form, setForm] = useState({
    accountSid: "",
    authToken: "",
    fromNumber: "",
    contentSid: "",
    templateName: "",
    messagingServiceSid: "",
  });
  const [testNumber, setTestNumber] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: QueryKeys.whatsapp.connection() });

  const connect = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSid: form.accountSid.trim(),
          authToken: form.authToken.trim(),
          fromNumber: form.fromNumber.trim(),
          contentSid: form.contentSid.trim(),
          templateName: form.templateName.trim() || undefined,
          messagingServiceSid: form.messagingServiceSid.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Verbindung fehlgeschlagen");
      return body;
    },
    onSuccess: () => {
      setForm((f) => ({ ...f, authToken: "" }));
      invalidate();
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/whatsapp", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Trennen fehlgeschlagen");
    },
    onSuccess: invalidate,
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/whatsapp?action=test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: testNumber.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Test fehlgeschlagen");
      return body as { sid: string };
    },
  });

  return (
    <div className="bg-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">WhatsApp (Twilio)</h2>
        {connection?.connected && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
            <Check className="h-3 w-3" /> Verbunden
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Absendernummer für die WhatsApp-Weiterleitung aus dem Work-Panel. Jede
        Nachricht geht als genehmigtes Twilio-Content-Template raus. Meta/Twilio
        verlangen ein dokumentiertes Opt-in des Creators.
      </p>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Lädt…</p>
      ) : connection?.connected ? (
        <>
          <div className="rounded-xl border border-border-light divide-y divide-border-light text-sm">
            <Row k="Absender" v={connection.fromNumber ?? "—"} />
            <Row k="Template" v={connection.templateName ?? "—"} />
            <Row k="Account SID" v={`…${connection.accountSidLast4 ?? "????"}`} />
            <Row
              k="Quelle"
              v={
                connection.source === "env"
                  ? "Umgebungsvariablen (alle Agenturen)"
                  : "Für diese Agentur gespeichert"
              }
            />
            {connection.connectedAt && (
              <Row
                k="Verbunden am"
                v={new Date(connection.connectedAt).toLocaleDateString("de-DE")}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-test">Verbindung testen</Label>
            <div className="flex gap-2">
              <Input
                id="wa-test"
                type="tel"
                placeholder="+4915112345678"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={!testNumber.trim() || sendTest.isPending}
                onClick={() => sendTest.mutate()}
              >
                {sendTest.isPending ? "Sendet…" : "Test senden"}
              </Button>
            </div>
            {sendTest.isSuccess && (
              <p className="text-xs text-brand">Gesendet · {sendTest.data.sid}</p>
            )}
            {sendTest.error && (
              <p className="text-xs text-destructive">
                {(sendTest.error as Error).message}
              </p>
            )}
          </div>

          {connection.source === "db" && (
            <Button
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate()}
            >
              {disconnect.isPending ? "Trennt…" : "Trennen"}
            </Button>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <Field label="Account SID" id="wa-sid">
            <Input
              id="wa-sid"
              placeholder="AC…"
              value={form.accountSid}
              onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
            />
          </Field>
          <Field label="Auth Token" id="wa-token">
            <Input
              id="wa-token"
              type="password"
              placeholder="••••••••"
              value={form.authToken}
              onChange={(e) => setForm({ ...form, authToken: e.target.value })}
            />
          </Field>
          <Field label="Absendernummer (E.164)" id="wa-from">
            <Input
              id="wa-from"
              type="tel"
              placeholder="+4915112345678"
              value={form.fromNumber}
              onChange={(e) => setForm({ ...form, fromNumber: e.target.value })}
            />
          </Field>
          <Field label="Content-Template-SID" id="wa-content">
            <Input
              id="wa-content"
              placeholder="HX…"
              value={form.contentSid}
              onChange={(e) => setForm({ ...form, contentSid: e.target.value })}
            />
          </Field>
          <Field label="Template-Name (optional)" id="wa-tplname">
            <Input
              id="wa-tplname"
              value={form.templateName}
              onChange={(e) => setForm({ ...form, templateName: e.target.value })}
            />
          </Field>
          <Field label="Messaging Service SID (optional)" id="wa-mgsid">
            <Input
              id="wa-mgsid"
              placeholder="MG…"
              value={form.messagingServiceSid}
              onChange={(e) =>
                setForm({ ...form, messagingServiceSid: e.target.value })
              }
            />
          </Field>
          {connect.error && (
            <p className="text-xs text-destructive">
              {(connect.error as Error).message}
            </p>
          )}
          <Button
            disabled={
              connect.isPending ||
              !form.accountSid.trim() ||
              !form.authToken.trim() ||
              !form.fromNumber.trim() ||
              !form.contentSid.trim()
            }
            onClick={() => connect.mutate()}
          >
            {connect.isPending ? "Verbindet…" : "Verbinden"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IntegrationsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="space-y-1">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" />
          Einstellungen
        </Link>
        <h1 className="text-base font-semibold">Integrationen</h1>
        <p className="text-xs text-muted-foreground">
          Verbundene Dienste dieser Agentur.
        </p>
      </div>

      <WhatsAppPanel />

      <Link
        href="/integrations"
        className="flex items-center gap-3 bg-card rounded-2xl p-5 hover:bg-muted/40 transition-colors"
      >
        <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Postfächer</p>
          <p className="text-xs text-muted-foreground">
            E-Mail-Konten (Gmail, Outlook, IMAP) verbinden und Creatorn zuordnen.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>
    </div>
  );
}
