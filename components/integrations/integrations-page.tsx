"use client";

import { useEffect, useState } from "react";
import { Inbox, RefreshCw, X, Check, AlertCircle, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Provider = "gmail" | "outlook" | "imap";

type Integration = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  status: string;
  last_sync_at: string | null;
};

const PROVIDERS: {
  id: Provider;
  name: string;
  description: string;
  hint?: string;
  presetKey?: string;
}[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Verbinde über IMAP mit einem App-Passwort (erforderlich wenn 2FA aktiv).",
    hint: "https://myaccount.google.com/apppasswords",
    presetKey: "gmail",
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft 365",
    description: "Verbinde Outlook, Exchange oder Microsoft 365 via IMAP.",
    presetKey: "outlook",
  },
  {
    id: "imap",
    name: "IMAP / SMTP",
    description: "Beliebiger Mail-Server mit App-Passwort.",
  },
];

const PRESETS: Record<
  string,
  { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }
> = {
  gmail: { imap_host: "imap.gmail.com", imap_port: 993, smtp_host: "smtp.gmail.com", smtp_port: 465 },
  outlook: { imap_host: "outlook.office365.com", imap_port: 993, smtp_host: "smtp.office365.com", smtp_port: 587 },
  icloud: { imap_host: "imap.mail.me.com", imap_port: 993, smtp_host: "smtp.mail.me.com", smtp_port: 587 },
  yahoo: { imap_host: "imap.mail.yahoo.com", imap_port: 993, smtp_host: "smtp.mail.yahoo.com", smtp_port: 465 },
  gmx: { imap_host: "imap.gmx.com", imap_port: 993, smtp_host: "mail.gmx.com", smtp_port: 465 },
  webde: { imap_host: "imap.web.de", imap_port: 993, smtp_host: "smtp.web.de", smtp_port: 587 },
  ionos: { imap_host: "imap.ionos.de", imap_port: 993, smtp_host: "smtp.ionos.de", smtp_port: 465 },
};

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getPresetForDomain(domain: string) {
  if (domain.endsWith("gmail.com")) return PRESETS.gmail;
  if (domain.endsWith("outlook.com") || domain.endsWith("hotmail.com") || domain.endsWith("live.com")) return PRESETS.outlook;
  if (domain.endsWith("icloud.com") || domain.endsWith("me.com")) return PRESETS.icloud;
  if (domain.endsWith("yahoo.com") || domain.endsWith("yahoo.de")) return PRESETS.yahoo;
  if (domain.endsWith("gmx.de") || domain.endsWith("gmx.net") || domain.endsWith("gmx.com")) return PRESETS.gmx;
  if (domain.endsWith("web.de")) return PRESETS.webde;
  if (domain.endsWith("ionos.de") || domain.endsWith("ionos.com")) return PRESETS.ionos;
  return null;
}

type FormState = {
  email: string;
  display_name: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_username: string;
  imap_password: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
};

const defaultForm = (): FormState => ({
  email: "",
  display_name: "",
  imap_host: "",
  imap_port: 993,
  imap_secure: true,
  imap_username: "",
  imap_password: "",
  smtp_host: "",
  smtp_port: 465,
  smtp_secure: true,
});

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProvider, setOpenProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function loadIntegrations() {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const json = await res.json();
      setIntegrations(json.integrations ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadIntegrations();
  }, []);

  // Pre-fill IMAP host/port when provider is selected
  useEffect(() => {
    if (!openProvider) return;
    const preset = PRESETS[openProvider] ?? null;
    setForm((f) => ({
      ...f,
      imap_host: preset?.imap_host ?? "",
      imap_port: preset?.imap_port ?? 993,
      smtp_host: preset?.smtp_host ?? "",
      smtp_port: preset?.smtp_port ?? 465,
    }));
    setTestResult(null);
    setSaveError(null);
  }, [openProvider]);

  // Auto-detect preset from email domain (for generic IMAP)
  useEffect(() => {
    if (openProvider !== "imap") return;
    const domain = form.email.split("@")[1]?.toLowerCase().trim();
    if (!domain) return;
    const preset = getPresetForDomain(domain);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      imap_host: f.imap_host || preset.imap_host,
      imap_port: f.imap_port || preset.imap_port,
      smtp_host: f.smtp_host || preset.smtp_host,
      smtp_port: f.smtp_port || preset.smtp_port,
    }));
  }, [form.email, openProvider]);

  function closeModal() {
    setOpenProvider(null);
    setForm(defaultForm());
    setTestResult(null);
    setSaveError(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imap_host: form.imap_host,
          imap_port: form.imap_port,
          imap_secure: form.imap_secure,
          imap_username: form.imap_username || form.email,
          imap_password: form.imap_password,
        }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch {
      setTestResult({ ok: false, error: "Verbindung fehlgeschlagen" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          display_name: form.display_name || null,
          imap_host: form.imap_host,
          imap_port: form.imap_port,
          imap_secure: form.imap_secure,
          imap_username: form.imap_username || form.email,
          imap_password: form.imap_password,
          smtp_host: form.smtp_host || null,
          smtp_port: form.smtp_port || null,
          smtp_secure: form.smtp_secure,
          provider_label: openProvider ?? "imap",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error ?? "Verbindung fehlgeschlagen");
      } else {
        closeModal();
        await loadIntegrations();
      }
    } catch {
      setSaveError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      await fetch(`/api/integrations/${id}/sync`, { method: "POST" });
      await loadIntegrations();
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/integrations/${id}`, { method: "DELETE" });
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const canTest = !!form.imap_host && !!form.imap_password && !!(form.imap_username || form.email);
  const canSave = !!form.email && !!form.imap_host && !!form.imap_password;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight mb-1">Integrations</h1>
        <p className="text-muted-foreground text-sm">
          Verbinde E-Mail-Postfächer damit eingehende Nachrichten in deinem Inbox landen.
        </p>
      </div>

      {/* Connected integrations */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium">Verbundene Postfächer</h2>
          <span className="text-xs text-muted-foreground">{integrations.length} aktiv</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Laden…
          </div>
        ) : integrations.length === 0 ? (
          <div className="border border-dashed border-border-light rounded-2xl p-8 text-center text-muted-foreground text-sm">
            Noch kein Postfach verbunden. Wähle unten einen Anbieter.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {integrations.map((integ) => (
              <div
                key={integ.id}
                className="flex items-center gap-4 px-4 py-3 bg-card rounded-2xl"
              >
                <div className="w-9 h-9 rounded-xl bg-sidebar flex items-center justify-center shrink-0">
                  <Inbox className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {integ.display_name ?? integ.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {integ.provider} · Sync {timeAgo(integ.last_sync_at)}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    integ.status === "connected"
                      ? "bg-green-500/10 text-green-600"
                      : integ.status === "error"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {integ.status}
                </span>
                <button
                  onClick={() => handleSync(integ.id)}
                  disabled={syncingId === integ.id}
                  className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                  title="Sync"
                >
                  <RefreshCw className={cn("w-4 h-4", syncingId === integ.id && "animate-spin")} />
                </button>
                <button
                  onClick={() => handleDisconnect(integ.id)}
                  disabled={deletingId === integ.id}
                  className="p-2 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                  title="Trennen"
                >
                  {deletingId === integ.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Provider cards */}
      <section>
        <h2 className="text-base font-medium mb-3">Anbieter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              className="bg-card rounded-2xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sidebar flex items-center justify-center">
                  <Inbox className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{p.name}</span>
              </div>
              <p className="text-xs text-muted-foreground flex-1">{p.description}</p>
              <button
                onClick={() => {
                  setOpenProvider(p.id);
                  setForm(defaultForm());
                }}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl bg-sidebar hover:bg-muted transition-colors w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                Verbinden
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* IMAP Modal */}
      {openProvider && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md bg-background rounded-2xl border border-border-light shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
              <div>
                <div className="text-sm font-semibold">
                  {PROVIDERS.find((p) => p.id === openProvider)?.name} verbinden
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Nachrichten werden in deinen Inbox gezogen.
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gmail hint */}
            {openProvider === "gmail" && (
              <div className="mx-5 mt-4 px-3 py-2.5 bg-card rounded-xl text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Gmail:</strong> 2-Faktor muss aktiv sein, dann{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  App-Passwort erstellen
                </a>{" "}
                und unten einfügen — kein normales Google-Passwort.
              </div>
            )}

            {/* Form */}
            <div className="p-5 flex flex-col gap-3.5">
              <Field label="E-Mail-Adresse">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value, imap_username: f.imap_username || e.target.value }))}
                  placeholder="du@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </Field>

              <Field label="Anzeigename (optional)">
                <input
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="Partnerships Inbox"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </Field>

              <div className="grid grid-cols-[2fr_1fr] gap-2.5">
                <Field label="IMAP-Host">
                  <input
                    value={form.imap_host}
                    onChange={(e) => setForm((f) => ({ ...f, imap_host: e.target.value }))}
                    placeholder="imap.gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                  />
                </Field>
                <Field label="Port">
                  <input
                    type="number"
                    value={form.imap_port}
                    onChange={(e) => setForm((f) => ({ ...f, imap_port: parseInt(e.target.value, 10) || 993 }))}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                  />
                </Field>
              </div>

              <Field label="IMAP-Benutzername (Standard: E-Mail)">
                <input
                  value={form.imap_username}
                  onChange={(e) => setForm((f) => ({ ...f, imap_username: e.target.value }))}
                  placeholder={form.email || "du@gmail.com"}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </Field>

              <Field label="IMAP-Passwort / App-Passwort">
                <input
                  type="password"
                  value={form.imap_password}
                  onChange={(e) => setForm((f) => ({ ...f, imap_password: e.target.value }))}
                  placeholder="••••••••••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </Field>

              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none hover:text-foreground transition-colors">
                  SMTP für Versand (optional)
                </summary>
                <div className="grid grid-cols-[2fr_1fr] gap-2.5 mt-3">
                  <Field label="SMTP-Host">
                    <input
                      value={form.smtp_host}
                      onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                    />
                  </Field>
                  <Field label="Port">
                    <input
                      type="number"
                      value={form.smtp_port}
                      onChange={(e) => setForm((f) => ({ ...f, smtp_port: parseInt(e.target.value, 10) || 465 }))}
                      className="w-full px-3 py-2 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20"
                    />
                  </Field>
                </div>
              </details>

              {/* Test result */}
              {testResult && (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs",
                    testResult.ok
                      ? "bg-green-500/10 text-green-600"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {testResult.ok ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {testResult.ok ? "Verbindung erfolgreich" : (testResult.error ?? "Verbindung fehlgeschlagen")}
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-destructive/10 text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {saveError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border-light flex items-center justify-between gap-2">
              <button
                onClick={handleTest}
                disabled={!canTest || testing}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-border-light hover:bg-muted transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {testing ? "Teste…" : "Verbindung testen"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="text-sm px-3 py-2 rounded-xl hover:bg-muted transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {saving ? "Verbinde…" : "Postfach verbinden"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
