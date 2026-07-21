"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Auflister } from "@/components/ui/auflister";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtDate } from "@/components/creators/dashboard/constants";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

type BrandListItem = {
  id: string;
  company_name: string;
  short_code: string;
  color: string;
  industry: string | null;
  deal_count: number;
  active_deal_count: number;
  total_revenue: number;
  last_activity: string | null;
  has_overdue_payment: boolean;
  only_contact: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#f97316",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#eab308",
  "#6b7280",
  "#0f172a",
];

function autoShortCode(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ── Brand Avatar ───────────────────────────────────────────────────────────────

function BrandAvatar({
  color,
  short_code,
  size = "sm",
}: {
  color: string;
  short_code: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "rounded-lg shrink-0 inline-flex items-center justify-center font-bold text-white",
        size === "sm" && "w-7 h-7 text-[10px]",
        size === "md" && "w-9 h-9 text-xs",
        size === "lg" && "w-14 h-14 text-lg",
      )}
      style={{ background: color }}
    >
      {short_code}
    </span>
  );
}

// ── Neue Brand Dialog ──────────────────────────────────────────────────────────

function NeueBrandDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (brand: BrandListItem) => void;
}) {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    if (!shortCode || shortCode === autoShortCode(name)) {
      setShortCode(autoShortCode(v));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: name.trim(),
          short_code: shortCode.trim() || autoShortCode(name),
          color,
          industry: industry.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const { brand } = await res.json();
      onCreated({
        ...brand,
        deal_count: 0,
        active_deal_count: 0,
        total_revenue: 0,
        last_activity: null,
        has_overdue_payment: false,
        only_contact: false,
      });
      setName("");
      setShortCode("");
      setColor(PRESET_COLORS[0]);
      setIndustry("");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Neue Brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Name *
            </label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nike, L'Oréal, …"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Kürzel
              </label>
              <Input
                value={shortCode}
                onChange={(e) =>
                  setShortCode(e.target.value.toUpperCase().slice(0, 4))
                }
                placeholder="NI"
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Branche
              </label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Fashion, Beauty, …"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Farbe
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-lg transition-all",
                    color === c && "ring-2 ring-offset-2 ring-ring",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {name.trim() && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <BrandAvatar
                color={color}
                short_code={shortCode || autoShortCode(name)}
                size="md"
              />
              <div>
                <p className="text-sm font-medium">{name}</p>
                {industry && (
                  <p className="text-xs text-muted-foreground">{industry}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Speichern…" : "Brand anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Columns ────────────────────────────────────────────────────────────────────

const brandColumns: ColumnDef<BrandListItem>[] = [
  {
    id: "brand",
    header: "Brand",
    accessorKey: "company_name",
    cell: ({ row }) => {
      const b = row.original;
      return (
        <div className="flex items-center gap-3 min-w-0">
          <BrandAvatar color={b.color} short_code={b.short_code} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{b.company_name}</p>
            <div className="flex items-center gap-1.5">
              {b.industry && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {b.industry}
                </p>
              )}
              {b.only_contact && (
                <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                  nur Kontakt
                </span>
              )}
            </div>
          </div>
        </div>
      );
    },
    size: 260,
  },
  {
    id: "deals",
    header: "Deals",
    accessorKey: "deal_count",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">
        {row.original.deal_count > 0 ? row.original.deal_count : "—"}
      </span>
    ),
    size: 96,
  },
  {
    id: "aktiv",
    header: "Aktiv",
    accessorKey: "active_deal_count",
    cell: ({ row }) => {
      const count = row.original.active_deal_count;
      return count > 0 ? (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-background text-[9px] font-medium">
          {count}
        </span>
      ) : (
        <span className="text-muted-foreground/40 text-sm">—</span>
      );
    },
    size: 64,
  },
  {
    id: "umsatz",
    header: "Umsatz",
    accessorKey: "total_revenue",
    cell: ({ row }) => (
      <span className="text-sm font-medium tabular-nums">
        {row.original.total_revenue > 0
          ? fmtMoney(row.original.total_revenue)
          : "—"}
      </span>
    ),
    size: 112,
  },
  {
    id: "letzter_deal",
    header: "Letzter Deal",
    accessorKey: "last_activity",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.last_activity
          ? fmtDate(row.original.last_activity)
          : "—"}
      </span>
    ),
    size: 128,
  },
  {
    id: "zahlung",
    header: "Zahlung",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.has_overdue_payment ? (
        <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Überfällig
        </span>
      ) : null,
    size: 96,
  },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BrandsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [neueOpen, setNeueOpen] = useState(false);
  const [localCreated, setLocalCreated] = useState<BrandListItem[]>([]);

  const { data, isPending } = useQuery<{ brands: BrandListItem[] }>({
    queryKey: ["brands"],
    queryFn: () => fetch("/api/brands").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  const allBrands: BrandListItem[] = [
    ...localCreated.filter(
      (b) => !(data?.brands ?? []).some((x) => x.id === b.id),
    ),
    ...(data?.brands ?? []),
  ];

  const filtered = allBrands
    .filter((b) => {
      if (filter === "active" && b.deal_count === 0) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.company_name.toLowerCase().includes(q) ||
          (b.industry?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) =>
      (b.last_activity ?? "").localeCompare(a.last_activity ?? ""),
    );

  const emptyText = search
    ? "Keine Brands gefunden"
    : filter === "active"
      ? "Noch keine aktiven Brand-Partnerschaften"
      : "Noch keine Brands angelegt";

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          {!isPending && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {allBrands.length} Brand{allBrands.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Brand suchen…"
              className="h-8 pl-8 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52"
            />
          </div>
          <SegmentedControl
            value={filter}
            onChange={(v) => setFilter(v as "active" | "all")}
            options={[
              { value: "active", label: "Aktive Partner" },
              { value: "all", label: "Alle" },
            ]}
          />
          <Button
            variant="default"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setNeueOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Neue Brand
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="p-5 gap-0 rounded-2xl">
        {isPending ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Auflister
            data={filtered}
            columns={brandColumns}
            emptyText={emptyText}
            onRowClick={(brand) => router.push(`/brands/${brand.id}`)}
          />
        )}
      </Card>

      <NeueBrandDialog
        open={neueOpen}
        onClose={() => setNeueOpen(false)}
        onCreated={(brand) => {
          setLocalCreated((prev) => [brand, ...prev]);
          queryClient.invalidateQueries({ queryKey: ["brands"] });
        }}
      />
    </div>
  );
}
