"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import { fmtMoney, fmtDate } from "@/components/creators/dashboard/constants";

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

type SortKey = "name" | "revenue" | "activity" | "deals";

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Neue Brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Nike, L'Oréal, …"
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Kürzel
              </label>
              <input
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="NI"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Branche
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Fashion, Beauty, …"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              <BrandAvatar color={color} short_code={shortCode || autoShortCode(name)} size="md" />
              <div>
                <p className="text-sm font-medium">{name}</p>
                {industry && <p className="text-xs text-muted-foreground">{industry}</p>}
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

// ── Sort header cell ───────────────────────────────────────────────────────────

function SortHead({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <TableHead
      className={cn(
        "sticky top-0 z-10 bg-card h-9 text-[10px] uppercase tracking-wider cursor-pointer select-none",
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="w-3 h-3 opacity-60" />
          ) : (
            <ChevronDown className="w-3 h-3 opacity-60" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BrandsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [sortBy, setSortBy] = useState<SortKey>("activity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [neueOpen, setNeueOpen] = useState(false);
  const [localCreated, setLocalCreated] = useState<BrandListItem[]>([]);

  const { data, isPending } = useQuery<{ brands: BrandListItem[] }>({
    queryKey: ["brands"],
    queryFn: () => fetch("/api/brands").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

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
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.company_name.localeCompare(b.company_name);
      else if (sortBy === "revenue") cmp = a.total_revenue - b.total_revenue;
      else if (sortBy === "deals") cmp = a.deal_count - b.deal_count;
      else {
        const aDate = a.last_activity ?? "";
        const bDate = b.last_activity ?? "";
        cmp = aDate.localeCompare(bDate);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

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
            <input
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
      <Card className="p-0 gap-0 rounded-2xl overflow-hidden">
        {isPending ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Building2 className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search
                ? "Keine Brands gefunden"
                : filter === "active"
                  ? "Noch keine aktiven Brand-Partnerschaften"
                  : "Noch keine Brands angelegt"}
            </p>
            {!search && filter === "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNeueOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Brand anlegen
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-y-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortHead
                    label="Brand"
                    sortKey="name"
                    current={sortBy}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-65"
                  />
                  <SortHead
                    label="Deals"
                    sortKey="deals"
                    current={sortBy}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-24"
                  />
                  <TableHead className="sticky top-0 z-10 bg-card h-9 text-[10px] uppercase tracking-wider w-16">
                    Aktiv
                  </TableHead>
                  <SortHead
                    label="Umsatz"
                    sortKey="revenue"
                    current={sortBy}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-28"
                  />
                  <SortHead
                    label="Letzter Deal"
                    sortKey="activity"
                    current={sortBy}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-32"
                  />
                  <TableHead className="sticky top-0 z-10 bg-card h-9 text-[10px] uppercase tracking-wider w-24 text-right">
                    Zahlung
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((brand) => (
                  <TableRow
                    key={brand.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/brands/${brand.id}`)}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <BrandAvatar
                          color={brand.color}
                          short_code={brand.short_code}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {brand.company_name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {brand.industry && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {brand.industry}
                              </p>
                            )}
                            {brand.only_contact && (
                              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                                nur Kontakt
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm tabular-nums">
                        {brand.deal_count > 0 ? brand.deal_count : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      {brand.active_deal_count > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-background text-[9px] font-medium">
                          {brand.active_deal_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm font-medium tabular-nums">
                        {brand.total_revenue > 0 ? fmtMoney(brand.total_revenue) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs text-muted-foreground">
                        {brand.last_activity ? fmtDate(brand.last_activity) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      {brand.has_overdue_payment ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-red-600"
                          title="Zahlung überfällig"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Überfällig
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
