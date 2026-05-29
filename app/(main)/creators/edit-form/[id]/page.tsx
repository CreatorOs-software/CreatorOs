"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Inbox, Pencil } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  type Creator,
  type Brand,
  type Deal,
  type Mailbox,
  type CreatorsData,
} from "@/components/creators/creator-sheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  incoming: "oklch(0.6 0.02 85)",
  evaluating: "oklch(0.6 0.15 230)",
  negotiation: "oklch(0.75 0.15 75)",
  confirmed: "oklch(0.62 0.18 270)",
  production: "oklch(0.62 0.15 195)",
  approval: "oklch(0.62 0.18 340)",
  scheduled: "oklch(0.6 0.15 230)",
  posted: "oklch(0.85 0.15 85)",
  invoiced: "oklch(0.68 0.18 50)",
  paid: "oklch(0.65 0.15 145)",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  "on-break": "bg-yellow-100 text-yellow-700",
  inactive: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  "on-break": "Pause",
  inactive: "Inaktiv",
};

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "Twitch", "LinkedIn"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return `$${(n / 1000).toFixed(1)}k`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ c, size = "md" }: { c: Creator; size?: "sm" | "md" | "lg" | "xl" }) {
  const cls = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-xs", lg: "w-11 h-11 text-sm", xl: "w-14 h-14 text-base" }[size];
  return (
    <span className={cn("rounded-xl inline-flex items-center justify-center font-bold text-white shrink-0", cls)} style={{ background: c.color }}>
      {c.initials}
    </span>
  );
}

function PlatformBadge({ p }: { p: string }) {
  return <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{p}</span>;
}

function DealRow({ deal, brand }: { deal: Deal; brand: Brand | undefined }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-light/50 last:border-0">
      {brand ? (
        <span className="w-6 h-6 rounded-lg inline-flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: brand.color }}>
          {brand.short_code}
        </span>
      ) : (
        <span className="w-6 h-6 rounded-lg bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{brand?.company_name ?? "—"} · {deal.campaign_type ?? deal.title}</div>
        {deal.deliverables?.length > 0 && <div className="text-xs text-muted-foreground truncate">{deal.deliverables.join(", ")}</div>}
      </div>
      <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STAGE_COLORS[deal.status] ?? "oklch(0.6 0.02 85)" }} />
        {deal.status}
      </div>
      <span className="text-sm font-medium tabular-nums shrink-0">{formatMoney(Number(deal.budget))}</span>
    </div>
  );
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

function EditForm({ creator, onCancel, onSaved }: { creator: Creator; onCancel: () => void; onSaved: (c: Creator) => void }) {
  const [saving, setSaving] = useState(false);
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
    setForm((f) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      full_name: form.full_name.trim(),
      handle: form.handle.trim() || null,
      niche: form.niche.trim() || null,
      followers: form.followers.trim() || null,
      monthly_revenue: Number(form.monthly_revenue) || 0,
      status: form.status,
      platforms: form.platforms,
    };
    await fetch(`/api/creators/${creator.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    onSaved({ ...creator, ...body });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">Name *</Label>
          <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="handle">Handle</Label>
          <Input id="handle" value={form.handle} placeholder="@handle" onChange={(e) => setForm({ ...form, handle: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="niche">Niche</Label>
          <Input id="niche" value={form.niche} placeholder="Lifestyle" onChange={(e) => setForm({ ...form, niche: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="followers">Reach</Label>
          <Input id="followers" value={form.followers} placeholder="120k" onChange={(e) => setForm({ ...form, followers: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="revenue">Monatl. Revenue ($)</Label>
          <Input id="revenue" type="number" min={0} value={form.monthly_revenue} onChange={(e) => setForm({ ...form, monthly_revenue: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val as typeof form.status })}>
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

      <div className="flex gap-2 justify-end pt-2 border-t border-border-light">
        <Button type="button" variant="ghost" onClick={onCancel}>Abbrechen</Button>
        <Button type="submit" disabled={!form.full_name.trim() || saving} className="bg-yellow-400 text-black hover:bg-yellow-300">
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
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery<CreatorsData>({
    queryKey: ["creators"],
    queryFn: () => fetch("/api/creators").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Laden…</span>
      </div>
    );
  }

  const creator = data?.creators.find((c) => c.id === id);

  if (!creator) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">Creator nicht gefunden.</p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/creators")}>Zurück zur Übersicht</Button>
      </div>
    );
  }

  const brands = data?.brands ?? [];
  const deals = (data?.deals ?? []).filter((d: Deal) => d.creator_id === id);
  const mailboxes = (data?.mailboxes ?? []).filter((m: Mailbox) => m.creator_id === id);

  const totalRevenue = deals.reduce((s: number, d: Deal) => s + Number(d.budget), 0);
  const avgDeal = deals.length ? Math.round(totalRevenue / deals.length) : 0;

  function handleSaved(updated: Creator) {
    queryClient.setQueryData<CreatorsData>(["creators"], (prev) => {
      if (!prev) return prev;
      return { ...prev, creators: prev.creators.map((c) => (c.id === updated.id ? updated : c)) };
    });
    setEditing(false);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border-light pb-0 mb-0">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/creators")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
            {creator.id.slice(0, 8).toUpperCase()}
          </span>
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={() => setEditing(!editing)}>
            <Pencil className="w-3.5 h-3.5" />
            {editing ? "Abbrechen" : "Bearbeiten"}
          </Button>
        </div>

        {!editing && (
          <>
            <div className="flex items-start gap-4 mb-4">
              <Avatar c={creator} size="xl" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold tracking-tight">{creator.full_name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{creator.handle ?? "—"} · {creator.niche ?? "—"}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {creator.platforms.map((p) => <PlatformBadge key={p} p={p} />)}
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", STATUS_CLASS[creator.status])}>
                    {STATUS_LABEL[creator.status]}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-5 shrink-0 pt-1 text-right">
                {[
                  { label: "Reach", value: creator.followers ?? "—" },
                  { label: "Deals", value: deals.length },
                  { label: "MTD", value: formatMoney(creator.monthly_revenue) },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">{s.label}</div>
                    <div className="text-lg font-semibold tabular-nums">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList variant="line" className="w-full rounded-none border-0 bg-transparent h-auto pb-0">
                {[
                  { value: "overview", label: "Übersicht" },
                  { value: "campaigns", label: "Kampagnen" },
                  { value: "finance", label: "Finanzen" },
                  { value: "notes", label: "Notizen" },
                ].map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="rounded-none px-3 pb-2">{t.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </>
        )}

        {editing && <h2 className="text-base font-semibold pb-4">Creator bearbeiten</h2>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-5">
        {editing ? (
          <EditForm creator={creator} onCancel={() => setEditing(false)} onSaved={handleSaved} />
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="h-full">
            <TabsContent value="overview" className="flex flex-col gap-5">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Gesamtvolumen", value: `$${(totalRevenue / 1000).toFixed(1)}k` },
                  { label: "Aktive Deals", value: deals.filter((d: Deal) => !["paid", "posted"].includes(d.status)).length },
                  { label: "Ø Deal-Größe", value: deals.length ? `$${avgDeal.toLocaleString()}` : "—" },
                  { label: "Monatl. Umsatz", value: formatMoney(creator.monthly_revenue) },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground mb-1">{s.label}</div>
                    <div className="text-lg font-semibold tabular-nums">{s.value}</div>
                  </div>
                ))}
              </div>

              {mailboxes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Verbundene Postfächer</h3>
                  <div className="bg-muted/30 rounded-xl px-4">
                    {mailboxes.map((m: Mailbox) => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border-light/50 last:border-0">
                        <span className="w-8 h-8 rounded-xl bg-sidebar flex items-center justify-center shrink-0">
                          <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{m.display_name ?? m.email}</div>
                          {m.display_name && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize shrink-0">{m.provider}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Aktuelle Deals ({deals.length})</h3>
                {deals.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">Noch keine Deals.</div>
                ) : (
                  <div className="bg-muted/30 rounded-xl px-4">
                    {deals.slice(0, 6).map((d: Deal) => (
                      <DealRow key={d.id} deal={d} brand={brands.find((b: Brand) => b.id === d.brand_id)} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="campaigns">
              <div className="bg-card rounded-2xl overflow-hidden border border-border-light">
                {deals.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Keine Kampagnen vorhanden.</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-light">
                        {["Brand", "Kampagne", "Status", "Fällig", "Wert"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((d: Deal) => {
                        const brand = brands.find((b: Brand) => b.id === d.brand_id);
                        return (
                          <tr key={d.id} className="border-b border-border-light/50 last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {brand && (
                                  <span className="w-5 h-5 rounded-md inline-flex items-center justify-center text-[9px] font-bold text-white" style={{ background: brand.color }}>
                                    {brand.short_code}
                                  </span>
                                )}
                                <span className="text-sm">{brand?.company_name ?? "—"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{d.campaign_type ?? d.title}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STAGE_COLORS[d.status] ?? "oklch(0.6 0.02 85)" }} />
                                {d.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{formatDate(d.deadline)}</td>
                            <td className="px-4 py-3 text-sm font-medium tabular-nums">${Number(d.budget).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="finance" className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "YTD Revenue (est.)", value: `$${((creator.monthly_revenue * 4.2) / 1000).toFixed(1)}k`, sub: "Hochrechnung" },
                  { label: "Gebucht (Deals)", value: `$${(totalRevenue / 1000).toFixed(1)}k`, sub: `${deals.length} Deals` },
                  { label: "Ø Deal-Größe", value: deals.length ? `$${avgDeal.toLocaleString()}` : "—", sub: `${deals.length} Deals` },
                  { label: "Monatl. Umsatz", value: formatMoney(creator.monthly_revenue), sub: "Aktueller Monat" },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                    <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
              {deals.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alle Deals</h3>
                  <div className="bg-muted/30 rounded-xl px-4">
                    {deals.map((d: Deal) => <DealRow key={d.id} deal={d} brand={brands.find((b: Brand) => b.id === d.brand_id)} />)}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Inbox className="w-8 h-8 opacity-20" />
              <p className="text-sm">Noch keine Notizen für {creator.full_name}.</p>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
