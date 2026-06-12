"use client";

import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

const PLATFORM_OPTIONS = [
  "Instagram", "TikTok", "YouTube", "Twitch", "LinkedIn",
  "Spotify", "OnlyFans", "X", "Snapchat", "Pinterest",
  "Facebook", "Patreon", "Substack",
];

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function pickColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CREATOR_COLORS[Math.abs(hash) % CREATOR_COLORS.length];
}

export default function CreateCreatorPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    handle: "",
    niche: "",
    followers: "",
    monthly_revenue: "",
    status: "active" as "active" | "on-break" | "inactive",
    platforms: [] as string[],
  });

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        full_name: form.full_name.trim(),
        handle: form.handle.trim() || null,
        niche: form.niche.trim() || null,
        followers: form.followers.trim() || null,
        monthly_revenue: Number(form.monthly_revenue) || 0,
        color: pickColor(form.full_name),
        initials: getInitials(form.full_name),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Fehler beim Anlegen.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: QueryKeys.creators.all() });
    router.push("/creators");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 mb-6 mt-1">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold">Neuer Creator</h1>
          <p className="text-xs text-muted-foreground">Creator-Profil anlegen</p>
        </div>
      </div>

      {/* Form card — full width */}
      <div className="bg-card rounded-2xl p-6 flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Name *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                placeholder="Anna Müller"
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                value={form.handle}
                placeholder="@annamueller"
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
                placeholder="0"
                onChange={(e) => setForm({ ...form, monthly_revenue: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val as typeof form.status })}
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
                  className={cn(form.platforms.includes(p) && "bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-300")}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t border-border-light">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={!form.full_name.trim() || saving}
              className="bg-yellow-400 text-black hover:bg-yellow-300"
            >
              {saving ? "Speichern…" : "Anlegen"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
