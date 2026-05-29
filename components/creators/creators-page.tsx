"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, List, Plus, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CreatorSheet,
  type Creator,
  type CreatorsData,
} from "./creator-sheet";

// ─── Constants ────────────────────────────────────────────────────────────────

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

function formatMoney(n: number) {
  return `$${(n / 1000).toFixed(1)}k`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ c, size = "md" }: { c: Creator; size?: "sm" | "md" | "lg" }) {
  const cls = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
  }[size];
  return (
    <span
      className={cn("rounded-xl inline-flex items-center justify-center font-bold text-white shrink-0", cls)}
      style={{ background: c.color }}
    >
      {c.initials}
    </span>
  );
}

// ─── Platform badge ───────────────────────────────────────────────────────────

function PlatformBadge({ p }: { p: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
      {p}
    </span>
  );
}

// ─── Creator Card (grid view) ─────────────────────────────────────────────────

function CreatorCard({ c, activeDeals, onClick }: { c: Creator; activeDeals: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <Avatar c={c} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{c.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">{c.handle ?? "—"}</div>
        </div>
        {c.status !== "active" && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", STATUS_CLASS[c.status])}>
            {STATUS_LABEL[c.status]}
          </span>
        )}
      </div>

      {(c.niche || c.platforms.length > 0) && (
        <div className="flex gap-1 flex-wrap">
          {c.niche && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground">{c.niche}</span>
          )}
          {c.platforms.map((p) => <PlatformBadge key={p} p={p} />)}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-light">
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Reach</div>
          <div className="text-sm font-semibold tabular-nums">{c.followers ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Deals</div>
          <div className="text-sm font-semibold tabular-nums">{activeDeals}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">MTD</div>
          <div className="text-sm font-semibold tabular-nums">{formatMoney(c.monthly_revenue)}</div>
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
            {["Creator", "Niche", "Plattformen", "Reach", "Deals", "MTD", "Status"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
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
                    <div className="text-xs text-muted-foreground">{c.handle ?? "—"}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{c.niche ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  {c.platforms.length > 0
                    ? c.platforms.map((p) => <PlatformBadge key={p} p={p} />)
                    : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-sm tabular-nums">{c.followers ?? "—"}</td>
              <td className="px-4 py-3 text-sm tabular-nums">{activePerCreator(c.id)}</td>
              <td className="px-4 py-3 text-sm font-medium tabular-nums">{formatMoney(c.monthly_revenue)}</td>
              <td className="px-4 py-3">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", STATUS_CLASS[c.status])}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CreatorsPage() {
  const router = useRouter();

  const { data, isPending } = useQuery<CreatorsData>({
    queryKey: ["creators"],
    queryFn: () => fetch("/api/creators").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const creators: Creator[] = data?.creators ?? [];
  const brands = data?.brands ?? [];
  const deals = data?.deals ?? [];
  const mailboxes = data?.mailboxes ?? [];

  const [layout, setLayout] = useState<"grid" | "table">("table");
  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);

  const filtered = creators.filter(
    (c) =>
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.handle?.toLowerCase().includes(search.toLowerCase()) ||
      c.niche?.toLowerCase().includes(search.toLowerCase()),
  );

  const activePerCreator = (id: string) =>
    deals.filter((d) => d.creator_id === id && !["paid", "posted"].includes(d.status)).length;

  const totalMtd = creators.reduce((s, c) => s + Number(c.monthly_revenue), 0);
  const totalActive = creators.reduce((s, c) => s + activePerCreator(c.id), 0);

  const profile = profileId ? (creators.find((c) => c.id === profileId) ?? null) : null;

  if (isPending) {
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
            {creators.length} Creator · {totalActive} aktive Deals · {formatMoney(totalMtd)} MTD
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="w-44 px-3 py-1.5 rounded-xl bg-card border border-border-light text-sm outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
          />

          <div className="flex bg-card border border-border-light rounded-xl p-0.5">
            <button
              onClick={() => setLayout("grid")}
              className={cn("p-1.5 rounded-lg transition-colors", layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout("table")}
              className={cn("p-1.5 rounded-lg transition-colors", layout === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Tabelle"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => router.push("/creators/create-form")}
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
              {search ? "Kein Creator gefunden." : "Noch keine Creator. Füge den ersten hinzu!"}
            </p>
          </div>
        ) : layout === "grid" ? (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {filtered.map((c) => (
              <CreatorCard
                key={c.id}
                c={c}
                activeDeals={activePerCreator(c.id)}
                onClick={() => setProfileId(c.id)}
              />
            ))}
          </div>
        ) : (
          <CreatorsTable
            creators={filtered}
            activePerCreator={activePerCreator}
            onOpen={(c) => setProfileId(c.id)}
          />
        )}
      </div>

      <CreatorSheet
        creator={profile}
        brands={brands}
        deals={deals}
        mailboxes={mailboxes}
        open={!!profileId}
        onOpenChange={(open) => { if (!open) setProfileId(null); }}
      />
    </div>
  );
}
