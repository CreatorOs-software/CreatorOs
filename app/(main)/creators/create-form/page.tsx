"use client";

import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Stepper } from "@/components/ui/stepper";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Basisdaten" },
  { id: 2, label: "Profil" },
  { id: 3, label: "Social Media" },
  { id: 4, label: "Prüfen" },
];

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Twitch",
  "LinkedIn",
  "Spotify",
  "OnlyFans",
  "X",
  "Snapchat",
  "Pinterest",
  "Facebook",
  "Patreon",
  "Substack",
];

const NICHE_OPTIONS = [
  "Lifestyle",
  "Fashion",
  "Beauty",
  "Food",
  "Travel",
  "Fitness",
  "Gaming",
  "Tech",
  "Business",
  "Comedy",
  "Music",
  "Education",
  "Automotive",
  "Sports",
];

const CREATOR_COLORS = [
  "oklch(0.62 0.18 25)",
  "oklch(0.60 0.18 145)",
  "oklch(0.60 0.18 230)",
  "oklch(0.62 0.18 270)",
  "oklch(0.65 0.18 50)",
  "oklch(0.62 0.18 190)",
  "oklch(0.62 0.18 310)",
  "oklch(0.62 0.18 100)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function pickColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CREATOR_COLORS[Math.abs(hash) % CREATOR_COLORS.length];
}

// ─── Form data type ───────────────────────────────────────────────────────────

type FormData = {
  vorname: string;
  nachname: string;
  handle: string;
  email: string;
  niche: string;
  bio: string;
  status: "active" | "on-break" | "inactive";
  platforms: string[];
  followers: string;
  monthly_revenue: string;
};

const INITIAL: FormData = {
  vorname: "",
  nachname: "",
  handle: "",
  email: "",
  niche: "",
  bio: "",
  status: "active",
  platforms: [],
  followers: "",
  monthly_revenue: "",
};

// ─── Step layouts ─────────────────────────────────────────────────────────────

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

function StepNav({
  onPrev,
  onNext,
  onSubmit,
  saving,
  nextDisabled,
}: {
  onPrev?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  saving?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-border-light mt-2">
      {onPrev ? (
        <Button type="button" variant="ghost" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
      ) : (
        <div />
      )}
      {onNext && (
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          Weiter
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
      {onSubmit && (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          {saving ? "Speichern…" : "Creator anlegen"}
        </Button>
      )}
    </div>
  );
}

// Step 1
function Step1({
  data,
  set,
  onNext,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Grundinformationen</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Name und Kontakt des neuen Creators
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup>
          <Label htmlFor="vorname">Vorname *</Label>
          <Input
            id="vorname"
            placeholder="z.B. Lena"
            value={data.vorname}
            onChange={(e) => set("vorname", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="nachname">Nachname</Label>
          <Input
            id="nachname"
            placeholder="z.B. Müller"
            value={data.nachname}
            onChange={(e) => set("nachname", e.target.value)}
          />
        </FieldGroup>
      </div>

      <FieldGroup>
        <Label htmlFor="handle">Handle</Label>
        <Input
          id="handle"
          placeholder="@lenamueller"
          value={data.handle}
          onChange={(e) => set("handle", e.target.value)}
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input
          id="email"
          type="email"
          placeholder="lena@example.com"
          value={data.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </FieldGroup>

      <StepNav onNext={onNext} nextDisabled={!data.vorname.trim()} />
    </div>
  );
}

// Step 2
function Step2({
  data,
  set,
  onNext,
  onPrev,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string | string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  function toggleNiche(tag: string) {
    set("niche", data.niche === tag ? "" : tag);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Profil & Kategorie</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nische und Beschreibung des Creators
        </p>
      </div>

      <FieldGroup>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Kurze Beschreibung des Creators…"
          value={data.bio}
          onChange={(e) => set("bio", e.target.value)}
          className="resize-none h-20"
        />
      </FieldGroup>

      <FieldGroup>
        <Label>Nische / Kategorie</Label>
        <div className="flex flex-wrap gap-2">
          {NICHE_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleNiche(tag)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-xl border transition-colors",
                data.niche === tag
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "border-border-light text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup>
        <Label>Status</Label>
        <Select
          value={data.status}
          onValueChange={(val) => {
            if (val) set("status", val);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="on-break">Pause</SelectItem>
            <SelectItem value="inactive">Inaktiv</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

// Step 3
function Step3({
  data,
  set,
  onNext,
  onPrev,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string | string[]) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  function togglePlatform(p: string) {
    const next = data.platforms.includes(p)
      ? data.platforms.filter((x) => x !== p)
      : [...data.platforms, p];
    set("platforms", next);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Social Media & Reichweite</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Plattformen und Kennzahlen des Creators
        </p>
      </div>

      <FieldGroup>
        <Label>Plattformen</Label>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-xl border transition-colors",
                data.platforms.includes(p)
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "border-border-light text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </FieldGroup>

      <div className="grid grid-cols-2 gap-4">
        <FieldGroup>
          <Label htmlFor="followers">Reichweite (gesamt)</Label>
          <Input
            id="followers"
            placeholder="120k"
            value={data.followers}
            onChange={(e) => set("followers", e.target.value)}
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="revenue">Monatl. Revenue ($)</Label>
          <Input
            id="revenue"
            type="number"
            min={0}
            placeholder="0"
            value={data.monthly_revenue}
            onChange={(e) => set("monthly_revenue", e.target.value)}
          />
        </FieldGroup>
      </div>

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

// Step 4 — Summary
function Step4({
  data,
  onPrev,
  onSubmit,
  saving,
  error,
}: {
  data: FormData;
  onPrev: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
}) {
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const rows: [string, string][] = [
    ["Name", fullName || "–"],
    ["Handle", data.handle || "–"],
    ["E-Mail", data.email || "–"],
    ["Nische", data.niche || "–"],
    [
      "Status",
      data.status === "active"
        ? "Aktiv"
        : data.status === "on-break"
          ? "Pause"
          : "Inaktiv",
    ],
    ["Plattformen", data.platforms.join(", ") || "–"],
    ["Reichweite", data.followers || "–"],
    [
      "Monatl. Revenue",
      data.monthly_revenue ? `$${data.monthly_revenue}` : "–",
    ],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold">Zusammenfassung</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Alles korrekt? Dann Creator jetzt anlegen.
        </p>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: fullName ? pickColor(fullName) : "#6b7280" }}
        >
          {fullName ? getInitials(fullName) : <UserRound className="w-5 h-5" />}
        </span>
        <div>
          <p className="text-sm font-semibold">{fullName || "–"}</p>
          <p className="text-xs text-muted-foreground">
            {data.handle || data.email || "–"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border-light divide-y divide-border-light">
        {rows.map(([key, val]) => (
          <div key={key} className="flex items-start gap-3 px-4 py-2.5">
            <span className="text-xs text-muted-foreground w-32 shrink-0">
              {key}
            </span>
            <span className="text-xs font-medium flex-1">{val}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <StepNav onPrev={onPrev} onSubmit={onSubmit} saving={saving} />
    </div>
  );
}

// Success
function StepSuccess({
  onReset,
  onGoBack,
}: {
  onReset: () => void;
  onGoBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center">
        <Check className="w-7 h-7 text-black" />
      </div>
      <div>
        <p className="text-base font-semibold">Creator wurde angelegt!</p>
        <p className="text-xs text-muted-foreground mt-1">
          Das Profil ist jetzt aktiv und kann bearbeitet werden.
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="outline" onClick={onGoBack}>
          Zur Übersicht
        </Button>
        <Button
          onClick={onReset}
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          + Weiteren Creator anlegen
        </Button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CreateCreatorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL);

  function set(key: keyof FormData, value: string | string[]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setForm(INITIAL);
    setStep(1);
    setDone(false);
    setError(null);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const fullName = [form.vorname, form.nachname]
      .filter(Boolean)
      .join(" ")
      .trim();
    const res = await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        handle: form.handle.trim() || null,
        niche: form.niche || null,
        followers: form.followers.trim() || null,
        monthly_revenue: Number(form.monthly_revenue) || 0,
        status: form.status,
        platforms: form.platforms,
        color: pickColor(fullName),
        initials: getInitials(fullName),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Fehler beim Anlegen.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: QueryKeys.creators.all() });
    setDone(true);
  }

  return (
    <div className="h-full flex flex-col ">
      <div className="bg-card rounded-2xl p-6 flex-1 overflow-y-auto ">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold">Neuer Creator</h1>
            <p className="text-xs text-muted-foreground">
              Creator-Profil anlegen
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="max-w-3xl mx-auto">
          {!done && (
            <div className="mb-8">
              <Stepper steps={STEPS} current={step} />
            </div>
          )}

          {/* Step content */}
          <div className="mx-auto">
            {done ? (
              <StepSuccess
                onReset={reset}
                onGoBack={() => router.push("/creators")}
              />
            ) : step === 1 ? (
              <Step1 data={form} set={set} onNext={() => setStep(2)} />
            ) : step === 2 ? (
              <Step2
                data={form}
                set={set}
                onNext={() => setStep(3)}
                onPrev={() => setStep(1)}
              />
            ) : step === 3 ? (
              <Step3
                data={form}
                set={set}
                onNext={() => setStep(4)}
                onPrev={() => setStep(2)}
              />
            ) : (
              <Step4
                data={form}
                onPrev={() => setStep(3)}
                onSubmit={handleSubmit}
                saving={saving}
                error={error}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
