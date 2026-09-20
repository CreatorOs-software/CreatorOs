"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Inbox, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@talentos/ui";
import { QueryKeys } from "@/lib/query-keys";
import type { WhatsAppConnectionPublic } from "@/domains/whatsapp";

type FacebookLoginResponse = { authResponse?: { code?: string } };
type FacebookSdk = {
  init(options: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void;
  login(callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>): void;
};
type MetaSignupData = { waba_id: string; phone_number_id: string; business_id?: string };

function WhatsAppPanel() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading } = useQuery<{ connection: WhatsAppConnectionPublic }>({
    queryKey: QueryKeys.whatsapp.connection(),
    queryFn: async () => {
      const response = await fetch("/api/admin/whatsapp");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Verbindung konnte nicht geladen werden");
      return body;
    },
    staleTime: 0,
  });
  const connection = data?.connection;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QueryKeys.whatsapp.all() });

  const connect = useMutation({
    mutationFn: startEmbeddedSignup,
    onSuccess: () => { setError(null); invalidate(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Verbindung fehlgeschlagen"),
  });
  const disconnect = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/whatsapp", { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Trennen fehlgeschlagen");
    },
    onSuccess: invalidate,
  });
  const sync = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/whatsapp?action=sync-templates", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Synchronisierung fehlgeschlagen");
    },
    onSuccess: invalidate,
  });

  return (
    <div className="bg-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">WhatsApp Business</h2>
        {connection?.connected && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
            <Check className="h-3 w-3" /> Verbunden
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Verbinde das WhatsApp-Business-Konto dieser Agentur direkt mit Meta. Jede Agentur verwendet ihre eigene Nummer.
      </p>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Lädt…</p>
      ) : connection?.connected ? (
        <>
          <div className="rounded-xl border border-border-light divide-y divide-border-light text-sm">
            <Row k="Absender" v={connection.displayPhoneNumber ?? "—"} />
            <Row k="Name" v={connection.verifiedName ?? "—"} />
            <Row k="Anbieter" v="Meta Cloud API" />
            {connection.connectedAt && <Row k="Verbunden am" v={new Date(connection.connectedAt).toLocaleDateString("de-DE")} />}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={sync.isPending} onClick={() => sync.mutate()}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
              Vorlagen synchronisieren
            </Button>
            <Button variant="destructive" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
              {disconnect.isPending ? "Trennt…" : "Verbindung trennen"}
            </Button>
          </div>
          {(sync.error || disconnect.error) && (
            <p className="text-xs text-destructive">{(sync.error ?? disconnect.error as Error)?.message}</p>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {connection?.status === "needs_reconnect" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Die frühere Twilio-Verbindung kann nicht übernommen werden. Verbinde die Nummer erneut direkt mit Meta.
            </p>
          )}
          <Button disabled={connect.isPending} onClick={() => connect.mutate()}>
            {connect.isPending ? "Meta wird geöffnet…" : "Mit WhatsApp verbinden"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Meta führt dich durch die Auswahl oder Einrichtung des Business-Kontos und der Telefonnummer.
          </p>
        </div>
      )}
      {(error || connection?.lastError) && <p className="text-xs text-destructive">{error ?? connection?.lastError}</p>}
    </div>
  );
}

async function startEmbeddedSignup(): Promise<void> {
  const setupResponse = await fetch("/api/admin/whatsapp?action=onboarding");
  const setup = await setupResponse.json() as { state?: string; appId?: string; configId?: string; error?: string };
  if (!setupResponse.ok) throw new Error(setup.error ?? "Verbindung konnte nicht gestartet werden");
  if (!setup.state || !setup.appId || !setup.configId) throw new Error("Meta Embedded Signup ist noch nicht vollständig konfiguriert.");
  const fb = await loadFacebookSdk(setup.appId);

  const signupData = new Promise<MetaSignupData>((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Meta-Anmeldung wurde nicht abgeschlossen.")); }, 10 * 60_000);
    const handler = (event: MessageEvent) => {
      if (!["https://www.facebook.com", "https://web.facebook.com"].includes(event.origin)) return;
      let message = event.data;
      if (typeof message === "string") {
        try { message = JSON.parse(message); } catch { return; }
      }
      if (message?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (message.event === "FINISH" && message.data?.waba_id && message.data?.phone_number_id) {
        cleanup();
        resolve(message.data as MetaSignupData);
      } else if (message.event === "CANCEL" || message.event === "ERROR") {
        cleanup();
        reject(new Error("Meta-Anmeldung wurde abgebrochen."));
      }
    };
    const cleanup = () => { window.clearTimeout(timeout); window.removeEventListener("message", handler); };
    window.addEventListener("message", handler);
  });

  const code = new Promise<string>((resolve, reject) => {
    fb.login((response) => {
      const value = response.authResponse?.code;
      if (value) resolve(value); else reject(new Error("Meta hat keinen Autorisierungscode zurückgegeben."));
    }, {
      config_id: setup.configId, response_type: "code", override_default_response_type: true,
      extras: { sessionInfoVersion: 3 },
    });
  });
  const [data, authorizationCode] = await Promise.all([signupData, code]);
  const response = await fetch("/api/admin/whatsapp", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: authorizationCode, wabaId: data.waba_id, phoneNumberId: data.phone_number_id,
      businessId: data.business_id ?? null, state: setup.state,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "WhatsApp-Verbindung fehlgeschlagen");
}

async function loadFacebookSdk(appId: string): Promise<FacebookSdk> {
  const existing = (window as typeof window & { FB?: FacebookSdk }).FB;
  if (existing) return existing;
  return new Promise((resolve, reject) => {
    const sdkWindow = window as typeof window & { FB?: FacebookSdk; fbAsyncInit?: () => void };
    sdkWindow.fbAsyncInit = () => {
      if (!sdkWindow.FB) return reject(new Error("Meta SDK konnte nicht geladen werden."));
      sdkWindow.FB.init({ appId, cookie: true, xfbml: false, version: "v21.0" });
      resolve(sdkWindow.FB);
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/de_DE/sdk.js";
    script.async = true;
    script.onerror = () => reject(new Error("Meta SDK konnte nicht geladen werden."));
    document.head.appendChild(script);
  });
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 px-3 py-2"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right">{v}</span></div>;
}

export default function IntegrationsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="space-y-1">
        <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Einstellungen
        </Link>
        <h1 className="text-base font-semibold">Integrationen</h1>
        <p className="text-xs text-muted-foreground">Verbundene Dienste dieser Agentur.</p>
      </div>
      <WhatsAppPanel />
      <Link href="/integrations" className="flex items-center gap-3 bg-card rounded-2xl p-5 hover:bg-muted/40 transition-colors">
        <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Postfächer</p><p className="text-xs text-muted-foreground">E-Mail-Konten verbinden und Creatorn zuordnen.</p></div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </Link>
    </div>
  );
}
