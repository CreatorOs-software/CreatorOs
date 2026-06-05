"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CreatorsData } from "@/components/creators/creator-sheet";

const PLATFORM_OPTIONS = [
  "Instagram", "TikTok", "YouTube", "Twitch", "LinkedIn",
  "Spotify", "OnlyFans", "X", "Snapchat", "Pinterest",
  "Facebook", "Patreon", "Substack",
];

// ─── Form (rendered only when creator is known) ───────────────────────────────

function EditForm({
  creator,
  onBack,
}: {
  creator: NonNullable<CreatorsData["creators"][number]>;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: creator.full_name,
    handle: creator.handle ?? "",
    niche: creator.niche ?? "",
    followers: creator.followers ?? "",
    monthly_revenue: String(creator.monthly_revenue),
    status: creator.status,
    platforms: creator.platforms,
  });

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setSaving(true);
    setError(null);
    const body = {
      full_name: form.full_name.trim(),
      handle: form.handle.trim() || null,
      niche: form.niche.trim() || null,
      followers: form.followers.trim() || null,
      monthly_revenue: Number(form.monthly_revenue) || 0,
      status: form.status,
      platforms: form.platforms,
    };
    const res = await fetch(`/api/creators/${creator.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Fehler beim Speichern.");
      return;
    }
    queryClient.setQueryData<CreatorsData>(["creators"], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        creators: prev.creators.map((c) =>
          c.id === creator.id ? { ...c, ...body } : c,
        ),
      };
    });
    onBack();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">Name *</Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="handle">Handle</Label>
          <Input
            id="handle"
            value={form.handle}
            placeholder="@handle"
            onChange={(e) => setForm({ ...form, handle: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="niche">Niche</Label>
          <Input
            id="niche"
            value={form.niche}
            placeholder="Lifestyle"
            onChange={(e) => setForm({ ...form, niche: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="followers">Reach</Label>
          <Input
            id="followers"
            value={form.followers}
            placeholder="120k"
            onChange={(e) => setForm({ ...form, followers: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="revenue">Monatl. Revenue ($)</Label>
          <Input
            id="revenue"
            type="number"
            min={0}
            value={form.monthly_revenue}
            onChange={(e) =>
              setForm({ ...form, monthly_revenue: e.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(val) =>
              setForm({ ...form, status: val as typeof form.status })
            }
          >
            <SelectTrigger className="w-full h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="on-break">Pause</SelectItem>
              <SelectItem value="inactive">Inaktiv</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Plattformen</Label>
        <div className="flex gap-2 flex-wrap">
          {PLATFORM_OPTIONS.map((p) => (
            <Button
              key={p}
              type="button"
              variant={form.platforms.includes(p) ? "default" : "outline"}
              size="sm"
              onClick={() => togglePlatform(p)}
              className={cn(
                form.platforms.includes(p) &&
                  "bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-300",
              )}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t border-border-light">
        <Button type="button" variant="ghost" onClick={onBack}>
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={!form.full_name.trim() || saving}
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          {saving ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditCreatorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data, isPending } = useQuery<CreatorsData>({
    queryKey: ["creators"],
    queryFn: () => fetch("/api/creators").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const creator = data?.creators.find((c) => c.id === id);

  if (!creator) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">Creator nicht gefunden.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/creators")}
        >
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 mb-6 mt-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/creators")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: creator.color }}
          >
            {creator.initials}
          </span>
          <div>
            <h1 className="text-base font-semibold">{creator.full_name}</h1>
            <p className="text-xs text-muted-foreground">Creator bearbeiten</p>
          </div>
        </div>
      </div>

      {/* Form card — full width */}
      <div className="bg-card rounded-2xl p-6 flex-1 overflow-y-auto">
        <EditForm creator={creator} onBack={() => router.push("/creators")} />
      </div>
    </div>
  );
}
