"use client";

import {
  AlertCircle,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QueryKeys } from "@/lib/query-keys";
import { GOOGLE_PATHS } from "./constants";
import type { Creator } from "@/domains/creators";

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = "gmail" | "outlook" | "imap";
type Step = "provider" | "form" | "creator";

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

// ─── Config ───────────────────────────────────────────────────────────────────

const PRESETS: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number; smtp_secure: boolean }> = {
  gmail:   { imap_host: "imap.gmail.com",            imap_port: 993, smtp_host: "smtp.gmail.com",            smtp_port: 465, smtp_secure: true  },
  outlook: { imap_host: "outlook.office365.com",     imap_port: 993, smtp_host: "smtp.office365.com",        smtp_port: 587, smtp_secure: false },
  icloud:  { imap_host: "imap.mail.me.com",          imap_port: 993, smtp_host: "smtp.mail.me.com",          smtp_port: 587, smtp_secure: false },
  yahoo:   { imap_host: "imap.mail.yahoo.com",       imap_port: 993, smtp_host: "smtp.mail.yahoo.com",       smtp_port: 465, smtp_secure: true  },
  gmx:     { imap_host: "imap.gmx.com",              imap_port: 993, smtp_host: "mail.gmx.com",              smtp_port: 465, smtp_secure: true  },
  webde:   { imap_host: "imap.web.de",               imap_port: 993, smtp_host: "smtp.web.de",               smtp_port: 587, smtp_secure: false },
  ionos:   { imap_host: "imap.ionos.de",             imap_port: 993, smtp_host: "smtp.ionos.de",             smtp_port: 465, smtp_secure: true  },
};

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

function presetForm(provider: Provider): Partial<FormState> {
  const p = PRESETS[provider] ?? null;
  if (!p) return {};
  return { imap_host: p.imap_host, imap_port: p.imap_port, smtp_host: p.smtp_host, smtp_port: p.smtp_port, smtp_secure: p.smtp_secure };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ─── Step: Provider ───────────────────────────────────────────────────────────

function ProviderStep({ onSelect }: { onSelect: (p: Provider) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Konto verbinden</DialogTitle>
        <p className="text-xs text-muted-foreground">
          Verbinde dein E-Mail-Postfach mit Crextio.
        </p>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        {/* Gmail */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("gmail")}
          className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-[#E7E7E7] bg-white transition-colors hover:bg-muted/50"
        >
          <svg viewBox="0 0 24 24" className="h-9 w-9">
            {GOOGLE_PATHS.map((p) => <path key={p.fill} d={p.d} fill={p.fill} />)}
          </svg>
          <span className="text-xs font-medium text-foreground">Gmail</span>
        </motion.button>

        {/* Outlook */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("outlook")}
          className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-[#E7E7E7] bg-white transition-colors hover:bg-muted/50"
        >
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none">
            <rect x="2" y="5" width="20" height="14" rx="2" fill="#0078D4" />
            <path d="M2 8l10 7 10-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-medium text-foreground">Outlook</span>
        </motion.button>

        {/* IMAP */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("imap")}
          className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-[#E7E7E7] bg-white transition-colors hover:bg-muted/50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">
            IMAP
          </div>
          <span className="text-xs font-medium text-foreground">IMAP / SMTP</span>
        </motion.button>

        {/* Coming soon */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex h-24 w-full cursor-not-allowed flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E7E7E7] text-muted-foreground opacity-50"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs">Weitere folgen</span>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Step: Form ───────────────────────────────────────────────────────────────

type FormStepProps = {
  provider: Provider;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  testResult: { ok: boolean; error?: string } | null;
  testing: boolean;
  saving: boolean;
  saveError: string | null;
  onBack: () => void;
  onTest: () => void;
  onSave: () => void;
};

const PROVIDER_LABELS: Record<Provider, string> = {
  gmail: "Gmail",
  outlook: "Outlook / Microsoft 365",
  imap: "IMAP / SMTP",
};

function FormStep({ provider, form, setForm, testResult, testing, saving, saveError, onBack, onTest, onSave }: FormStepProps) {
  function handleEmailChange(email: string) {
    const domain = email.split("@")[1]?.toLowerCase().trim();
    const preset = domain && provider === "imap" ? getPresetForDomain(domain) : null;
    setForm((f) => ({
      ...f,
      email,
      imap_username: f.imap_username || email,
      ...(preset
        ? {
            imap_host: f.imap_host || preset.imap_host,
            imap_port: f.imap_port || preset.imap_port,
            smtp_host: f.smtp_host || preset.smtp_host,
            smtp_port: f.smtp_port || preset.smtp_port,
          }
        : {}),
    }));
  }

  const canTest = !!form.imap_host && !!form.imap_password && !!(form.imap_username || form.email);
  const canSave = !!form.email && !!form.imap_host && !!form.imap_password;

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <DialogTitle>{PROVIDER_LABELS[provider]} verbinden</DialogTitle>
        </div>
        <p className="text-xs text-muted-foreground ml-8">
          Nachrichten werden in deinen Inbox gezogen.
        </p>
      </DialogHeader>

      {/* Gmail hint */}
      {provider === "gmail" && (
        <div className="rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
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

      <div className="flex flex-col gap-3">
        <Field label="E-Mail-Adresse">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="du@gmail.com"
            className="h-9 text-sm"
          />
        </Field>

        <Field label="Anzeigename (optional)">
          <Input
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            placeholder="Partnerships Inbox"
            className="h-9 text-sm"
          />
        </Field>

        <div className="grid grid-cols-[2fr_1fr] gap-2">
          <Field label="IMAP-Host">
            <Input
              value={form.imap_host}
              onChange={(e) => setForm((f) => ({ ...f, imap_host: e.target.value }))}
              placeholder="imap.gmail.com"
              className="h-9 text-sm"
            />
          </Field>
          <Field label="Port">
            <Input
              type="number"
              value={form.imap_port}
              onChange={(e) => setForm((f) => ({ ...f, imap_port: parseInt(e.target.value, 10) || 993 }))}
              className="h-9 text-sm"
            />
          </Field>
        </div>

        <Field label="IMAP-Benutzername">
          <Input
            value={form.imap_username}
            onChange={(e) => setForm((f) => ({ ...f, imap_username: e.target.value }))}
            placeholder={form.email || "du@gmail.com"}
            className="h-9 text-sm"
          />
        </Field>

        <Field label="App-Passwort / IMAP-Passwort">
          <Input
            type="password"
            value={form.imap_password}
            onChange={(e) => setForm((f) => ({ ...f, imap_password: e.target.value }))}
            placeholder="••••••••••••••••"
            className="h-9 text-sm"
          />
        </Field>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground transition-colors py-1">
            SMTP für Versand (optional)
          </summary>
          <div className="grid grid-cols-[2fr_1fr] gap-2 mt-3">
            <Field label="SMTP-Host">
              <Input
                value={form.smtp_host}
                onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="h-9 text-sm"
              />
            </Field>
            <Field label="Port">
              <Input
                type="number"
                value={form.smtp_port}
                onChange={(e) => setForm((f) => ({ ...f, smtp_port: parseInt(e.target.value, 10) || 465 }))}
                className="h-9 text-sm"
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
            {testResult.ok
              ? <Check className="h-3.5 w-3.5 shrink-0" />
              : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
            {testResult.ok
              ? "Verbindung erfolgreich — bereit zum Speichern."
              : (testResult.error ?? "Verbindung fehlgeschlagen")}
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs bg-destructive/10 text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {saveError}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E7E7E7]">
        <button
          onClick={onTest}
          disabled={!canTest || testing}
          className="flex items-center gap-1.5 rounded-lg border border-[#E7E7E7] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {testing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <RefreshCw className="h-3.5 w-3.5" />}
          {testing ? "Teste…" : "Verbindung testen"}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Zurück
          </button>
          <button
            onClick={onSave}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Verbinde…" : "Postfach verbinden"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step: Creator assignment ─────────────────────────────────────────────────

type CreatorStepProps = {
  integrationEmail: string;
  creators: Creator[];
  assigning: boolean;
  onAssign: (creatorId: string | null) => void;
};

function CreatorStep({ integrationEmail, creators, assigning, onAssign }: CreatorStepProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <DialogTitle>Postfach verbunden</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{integrationEmail}</p>
          </div>
        </div>
      </DialogHeader>

      <div>
        <p className="text-sm font-medium mb-3">Creator zuordnen</p>
        <p className="text-xs text-muted-foreground mb-4">
          Eingehende Mails in diesem Postfach werden dann dem Creator zugeordnet.
        </p>

        {creators.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine Creators gefunden.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {creators.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(selected === c.id ? null : c.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  selected === c.id
                    ? "border-foreground bg-foreground/5"
                    : "border-[#E7E7E7] hover:bg-muted/50",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-[11px] font-bold text-white">
                  {c.initials}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{c.full_name}</span>
                {selected === c.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E7E7E7]">
        <button
          onClick={() => onAssign(null)}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Überspringen
        </button>
        <button
          onClick={() => onAssign(selected)}
          disabled={!selected || assigning}
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-background disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {assigning ? "Speichere…" : "Zuordnen"}
        </button>
      </div>
    </div>
  );
}

// ─── AddMailboxDialog ─────────────────────────────────────────────────────────

export function AddMailboxDialog() {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newIntegration, setNewIntegration] = useState<{ id: string; email: string } | null>(null);
  const [assigning, setAssigning] = useState(false);

  const { data: creatorsData } = useQuery<{ creators: Creator[] }>({
    queryKey: QueryKeys.creators.list(),
    queryFn: () => fetch("/api/creators").then((r) => r.json() as Promise<{ creators: Creator[] }>),
    staleTime: 5 * 60_000,
    enabled: open,
  });
  const creators = creatorsData?.creators ?? [];

  function resetState() {
    setStep("provider");
    setProvider(null);
    setForm(defaultForm());
    setTestResult(null);
    setSaveError(null);
    setNewIntegration(null);
  }

  function handleOpenChange(o: boolean) {
    if (!o) resetState();
    setOpen(o);
  }

  function selectProvider(p: Provider) {
    setProvider(p);
    setForm((f) => ({ ...f, ...presetForm(p) }));
    setTestResult(null);
    setSaveError(null);
    setStep("form");
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
      const json = await res.json() as { ok: boolean; error?: string };
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
          provider_label: provider ?? "imap",
        }),
      });
      const json = await res.json() as { id?: string; integration?: { id: string }; error?: string };
      if (!res.ok) {
        setSaveError(json.error ?? "Verbindung fehlgeschlagen");
      } else {
        const id = json.id ?? json.integration?.id ?? "";
        setNewIntegration({ id, email: form.email });
        await queryClient.refetchQueries({ queryKey: QueryKeys.integrations.list() });
        queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.all() });
        setStep("creator");
      }
    } catch {
      setSaveError("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignCreator(creatorId: string | null) {
    if (!newIntegration) {
      handleOpenChange(false);
      return;
    }
    setAssigning(true);
    try {
      if (creatorId) {
        await fetch(`/api/integrations/${newIntegration.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creator_id: creatorId }),
        });
      }
      queryClient.invalidateQueries({ queryKey: QueryKeys.integrations.list() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.inbox.all() });
    } finally {
      setAssigning(false);
      handleOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-transparent text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
        <Plus className="h-4 w-4" />
      </DialogTrigger>

      <DialogContent
        className={cn(
          "transition-all duration-200",
          step === "provider" ? "sm:max-w-sm" : "sm:max-w-md",
        )}
      >
        <AnimatePresence mode="wait">
          {step === "provider" && (
            <motion.div
              key="provider"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <ProviderStep onSelect={selectProvider} />
            </motion.div>
          )}

          {step === "form" && provider && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <FormStep
                provider={provider}
                form={form}
                setForm={setForm}
                testResult={testResult}
                testing={testing}
                saving={saving}
                saveError={saveError}
                onBack={() => setStep("provider")}
                onTest={handleTest}
                onSave={handleSave}
              />
            </motion.div>
          )}

          {step === "creator" && newIntegration && (
            <motion.div
              key="creator"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <CreatorStep
                integrationEmail={newIntegration.email}
                creators={creators}
                assigning={assigning}
                onAssign={handleAssignCreator}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
