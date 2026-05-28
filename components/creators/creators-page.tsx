"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutGrid,
  List,
  Plus,
  Loader2,
  X,
  ChevronRight,
  Star,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Creator = {
  id: string;
  full_name: string;
  handle: string | null;
  initials: string;
  color: string;
  niche: string | null;
  status: "active" | "on-break" | "inactive";
  platforms: string[];
  followers: string | null;
  monthly_revenue: number;
};

type Brand = {
  id: string;
  company_name: string;
  short_code: string;
  color: string;
};

type Deal = {
  id: string;
  creator_id: string | null;
  brand_id: string | null;
  title: string;
  budget: number;
  status: string;
  deadline: string | null;
  campaign_type: string | null;
  deliverables: string[];
};

type Mailbox = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  creator_id: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CREATOR_COLORS[Math.abs(hash) % CREATOR_COLORS.length];
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatMoney(n: number): string {
  return `$${(n / 1000).toFixed(1)}k`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  c,
  size = "md",
}: {
  c: Creator;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
    xl: "w-14 h-14 text-base",
  }[size];
  return (
    <span
      className={cn(
        "rounded-xl inline-flex items-center justify-center font-bold text-white shrink-0",
        sizeClass,
      )}
      style={{ background: c.color }}
    >
      {c.initials}
    </span>
  );
}

// ─── Platform badges ──────────────────────────────────────────────────────────

function PlatformBadge({ p }: { p: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
      {p}
    </span>
  );
}

// ─── Creator Card (grid view) ─────────────────────────────────────────────────

function CreatorCard({
  c,
  activeDeals,
  onClick,
}: {
  c: Creator;
  activeDeals: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <Avatar c={c} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{c.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {c.handle ?? "—"}
          </div>
        </div>
        {c.status !== "active" && (
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
              STATUS_CLASS[c.status],
            )}
          >
            {STATUS_LABEL[c.status]}
          </span>
        )}
      </div>

      {(c.niche || c.platforms.length > 0) && (
        <div className="flex gap-1 flex-wrap">
          {c.niche && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground">
              {c.niche}
            </span>
          )}
          {c.platforms.map((p) => (
            <PlatformBadge key={p} p={p} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-light">
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Reach</div>
          <div className="text-sm font-semibold tabular-nums">
            {c.followers ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Deals</div>
          <div className="text-sm font-semibold tabular-nums">{activeDeals}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">MTD</div>
          <div className="text-sm font-semibold tabular-nums">
            {formatMoney(c.monthly_revenue)}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Creators Table ───────────────────────────────────────────────────────────

function CreatorsTable({
  creators,
  activePerCreator,
  onOpen,
}: {
  creators: Creator[];
  activePerCreator: (id: string) => number;
  onOpen: (c: Creator) => void;
}) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-light">
            {["Creator", "Niche", "Plattformen", "Reach", "Deals", "MTD", "Status"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {creators.map((c) => (
            <tr
              key={c.id}
              onClick={() => onOpen(c)}
              className="border-b border-border-light/50 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar c={c} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.handle ?? "—"}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {c.niche ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  {c.platforms.length > 0
                    ? c.platforms.map((p) => <PlatformBadge key={p} p={p} />)
                    : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-sm tabular-nums">
                {c.followers ?? "—"}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums">
                {activePerCreator(c.id)}
              </td>
              <td className="px-4 py-3 text-sm font-medium tabular-nums">
                {formatMoney(c.monthly_revenue)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    STATUS_CLASS[c.status],
                  )}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Add Creator Modal ────────────────────────────────────────────────────────

function AddCreatorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Creator) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    handle: "",
    niche: "",
    followers: "",
    monthly_revenue: "",
    status: "active" as Creator["status"],
    platforms: [] as string[],
  });

  const platformOptions = ["Instagram", "TikTok", "YouTube", "Twitch", "LinkedIn"];

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setSaving(true);
    const color = pickColor(form.full_name);
    const initials = getInitials(form.full_name);
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
        color,
        initials,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const json = await res.json();
      onCreated(json.creator);
      onClose();
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-xl bg-muted border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-border-light">
          <h2 className="text-base font-semibold flex-1">Neuer Creator</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Name *</span>
              <input
                className={inputClass}
                value={form.full_name}
                placeholder="Anna Müller"
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Handle</span>
              <input
                className={inputClass}
                value={form.handle}
                placeholder="@annamueller"
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Niche</span>
              <input
                className={inputClass}
                value={form.niche}
                placeholder="Lifestyle"
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Reach</span>
              <input
                className={inputClass}
                value={form.followers}
                placeholder="120k"
                onChange={(e) => setForm({ ...form, followers: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">
                Monatl. Revenue ($)
              </span>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={form.monthly_revenue}
                placeholder="0"
                onChange={(e) =>
                  setForm({ ...form, monthly_revenue: e.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Status</span>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Creator["status"] })
                }
              >
                <option value="active">Aktiv</option>
                <option value="on-break">Pause</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Plattformen</span>
            <div className="flex gap-2 flex-wrap">
              {platformOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl border transition-colors",
                    form.platforms.includes(p)
                      ? "bg-yellow-400 text-black border-yellow-400 font-medium"
                      : "border-border-light text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm hover:bg-muted transition-colors text-muted-foreground"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!form.full_name.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 text-black text-sm font-medium hover:bg-yellow-300 transition-colors disabled:opacity-40"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Speichern…" : "Anlegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deal Row ─────────────────────────────────────────────────────────────────

function DealRow({ deal, brand }: { deal: Deal; brand: Brand | undefined }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-light/50 last:border-0">
      {brand ? (
        <span
          className="w-6 h-6 rounded-lg inline-flex items-center justify-center text-[9px] font-bold text-white shrink-0"
          style={{ background: brand.color }}
        >
          {brand.short_code}
        </span>
      ) : (
        <span className="w-6 h-6 rounded-lg bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {brand?.company_name ?? "—"} · {deal.campaign_type ?? deal.title}
        </div>
        {deal.deliverables?.length > 0 && (
          <div className="text-xs text-muted-foreground truncate">
            {deal.deliverables.join(", ")}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: STAGE_COLORS[deal.status] ?? "oklch(0.6 0.02 85)" }}
        />
        {deal.status}
      </div>
      <span className="text-sm font-medium tabular-nums shrink-0">
        {formatMoney(Number(deal.budget))}
      </span>
    </div>
  );
}

// ─── Creator Profile Slide-over ───────────────────────────────────────────────

function CreatorProfile({
  creator,
  deals,
  brands,
  mailboxes,
  onClose,
}: {
  creator: Creator;
  deals: Deal[];
  brands: Brand[];
  mailboxes: Mailbox[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "campaigns" | "finance" | "notes">(
    "overview",
  );

  const totalRevenue = deals.reduce((s, d) => s + Number(d.budget), 0);
  const avgDeal = deals.length ? Math.round(totalRevenue / deals.length) : 0;

  const tabs = [
    { id: "overview" as const, label: "Übersicht" },
    { id: "campaigns" as const, label: "Kampagnen" },
    { id: "finance" as const, label: "Finanzen" },
    { id: "notes" as const, label: "Notizen" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch"
      onClick={onClose}
    >
      <div className="flex-1" />
      <div
        className="w-[min(820px,80%)] h-full bg-card border-l border-border-light flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 border-b border-border-light shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
              {creator.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Creator Info */}
          <div className="flex items-start gap-4 mb-4">
            <Avatar c={creator} size="xl" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">
                {creator.full_name}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {creator.handle ?? "—"} · {creator.niche ?? "—"}
              </p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {creator.platforms.map((p) => (
                  <PlatformBadge key={p} p={p} />
                ))}
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    STATUS_CLASS[creator.status],
                  )}
                >
                  {STATUS_LABEL[creator.status]}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-5 shrink-0 pt-1 text-right">
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  Reach
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {creator.followers ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  Deals
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {deals.length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  MTD
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatMoney(creator.monthly_revenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                  tab === t.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "overview" && (
            <div className="flex flex-col gap-5">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Gesamtvolumen", value: `$${(totalRevenue / 1000).toFixed(1)}k` },
                  { label: "Aktive Deals", value: String(deals.filter(d => !["paid", "posted"].includes(d.status)).length) },
                  { label: "Ø Deal-Größe", value: deals.length ? `$${avgDeal.toLocaleString()}` : "—" },
                  { label: "Monatl. Umsatz", value: formatMoney(creator.monthly_revenue) },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {s.label}
                    </div>
                    <div className="text-lg font-semibold tabular-nums">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Linked mailboxes */}
              {mailboxes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Verbundene Postfächer
                  </h3>
                  <div className="bg-muted/30 rounded-xl px-4 py-1">
                    {mailboxes.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 py-2.5 border-b border-border-light/50 last:border-0"
                      >
                        <span className="w-8 h-8 rounded-xl bg-sidebar flex items-center justify-center shrink-0">
                          <Inbox className="w-3.5 h-3.5 text-muted-foreground" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {m.display_name ?? m.email}
                          </div>
                          {m.display_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {m.email}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize shrink-0">
                          {m.provider}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Deals */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Aktuelle Deals ({deals.length})
                </h3>
                {deals.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Noch keine Deals.
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-xl px-4">
                    {deals.slice(0, 6).map((d) => (
                      <DealRow
                        key={d.id}
                        deal={d}
                        brand={brands.find((b) => b.id === d.brand_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "campaigns" && (
            <div className="bg-card rounded-2xl overflow-hidden border border-border-light">
              {deals.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Keine Kampagnen vorhanden.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-light">
                      {["Brand", "Kampagne", "Status", "Fällig", "Wert"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((d) => {
                      const brand = brands.find((b) => b.id === d.brand_id);
                      return (
                        <tr
                          key={d.id}
                          className="border-b border-border-light/50 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {brand && (
                                <span
                                  className="w-5 h-5 rounded-md inline-flex items-center justify-center text-[9px] font-bold text-white"
                                  style={{ background: brand.color }}
                                >
                                  {brand.short_code}
                                </span>
                              )}
                              <span className="text-sm">
                                {brand?.company_name ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {d.campaign_type ?? d.title}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  background:
                                    STAGE_COLORS[d.status] ?? "oklch(0.6 0.02 85)",
                                }}
                              />
                              {d.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
                            {formatDate(d.deadline)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium tabular-nums">
                            ${Number(d.budget).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "finance" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "YTD Revenue (est.)",
                    value: `$${((creator.monthly_revenue * 4.2) / 1000).toFixed(1)}k`,
                    sub: "Hochrechnung",
                  },
                  {
                    label: "Gebucht (Deals)",
                    value: `$${(totalRevenue / 1000).toFixed(1)}k`,
                    sub: `${deals.length} Deals`,
                  },
                  {
                    label: "Ø Deal-Größe",
                    value: deals.length
                      ? `$${avgDeal.toLocaleString()}`
                      : "—",
                    sub: `${deals.length} Deals`,
                  },
                  {
                    label: "Monatl. Umsatz",
                    value: formatMoney(creator.monthly_revenue),
                    sub: "Aktueller Monat",
                  },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1">
                      {s.label}
                    </div>
                    <div className="text-2xl font-semibold tabular-nums">
                      {s.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.sub}
                    </div>
                  </div>
                ))}
              </div>

              {deals.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Alle Deals
                  </h3>
                  <div className="bg-muted/30 rounded-xl px-4">
                    {deals.map((d) => (
                      <DealRow
                        key={d.id}
                        deal={d}
                        brand={brands.find((b) => b.id === d.brand_id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Inbox className="w-8 h-8 opacity-20" />
              <p className="text-sm">
                Noch keine Notizen für {creator.full_name}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type CreatorsData = {
  creators: Creator[];
  brands: Brand[];
  deals: Deal[];
  mailboxes: Mailbox[];
};

export function CreatorsPage() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery<CreatorsData>({
    queryKey: ["creators"],
    queryFn: () => fetch("/api/creators").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const creators: Creator[] = data?.creators ?? [];
  const brands: Brand[] = data?.brands ?? [];
  const deals: Deal[] = data?.deals ?? [];
  const mailboxes: Mailbox[] = data?.mailboxes ?? [];
  const loading = isPending;

  const [layout, setLayout] = useState<"grid" | "table">("grid");
  const [profile, setProfile] = useState<Creator | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = creators.filter(
    (c) =>
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.handle?.toLowerCase().includes(search.toLowerCase()) ||
      c.niche?.toLowerCase().includes(search.toLowerCase()),
  );

  const activePerCreator = (id: string) =>
    deals.filter(
      (d) =>
        d.creator_id === id && !["paid", "posted"].includes(d.status),
    ).length;

  const totalMtd = creators.reduce((s, c) => s + Number(c.monthly_revenue), 0);
  const totalActive = creators.reduce(
    (s, c) => s + activePerCreator(c.id),
    0,
  );

  function handleCreated(c: Creator) {
    queryClient.setQueryData<CreatorsData>(["creators"], (prev) => {
      if (!prev) return prev;
      return { ...prev, creators: [...prev.creators, c] };
    });
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 mb-4 mt-1">
        <div>
          <h1 className="text-base font-semibold">Creator</h1>
          <p className="text-xs text-muted-foreground">
            {creators.length} Creator · {totalActive} aktive Deals ·{" "}
            {formatMoney(totalMtd)} MTD
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="w-44 px-3 py-1.5 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
          />

          {/* Layout toggle */}
          <div className="flex bg-card border border-border-light rounded-xl p-0.5">
            <button
              onClick={() => setLayout("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                layout === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout("table")}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                layout === "table"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Tabelle"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400 text-black text-sm font-medium hover:bg-yellow-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Creator hinzufügen
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Star className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {search
                ? "Kein Creator gefunden."
                : "Noch keine Creator. Füge den ersten hinzu!"}
            </p>
          </div>
        ) : layout === "grid" ? (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {filtered.map((c) => (
              <CreatorCard
                key={c.id}
                c={c}
                activeDeals={activePerCreator(c.id)}
                onClick={() => setProfile(c)}
              />
            ))}
          </div>
        ) : (
          <CreatorsTable
            creators={filtered}
            activePerCreator={activePerCreator}
            onOpen={(c) => setProfile(c)}
          />
        )}
      </div>

      {/* Modals */}
      {profile && (
        <CreatorProfile
          creator={profile}
          deals={deals.filter((d) => d.creator_id === profile.id)}
          brands={brands}
          mailboxes={mailboxes.filter((m) => m.creator_id === profile.id)}
          onClose={() => setProfile(null)}
        />
      )}
      {showAdd && (
        <AddCreatorModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
