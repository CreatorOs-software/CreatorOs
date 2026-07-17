"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Creator } from "@/domains/creators/types";
import type { DealFull } from "./types";
import {
  ALT,
  LAUFEND,
  PLATFORM_ICONS,
  PLATFORM_KEY,
  STATUS_STYLE,
  daysUntil,
  fmtDate,
  fmtMoney,
} from "./constants";
import { BrandAvatar } from "./shared";
import { DealDialog } from "./deal-dialog";
import { AnfragenPanel } from "./anfragen-panel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AnimatedHeight } from "@/components/ui/animated-height";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Anfrage } from "./types";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  "incoming",
  "evaluating",
  "negotiation",
  "confirmed",
  "production",
  "approval",
  "scheduled",
  "posted",
  "invoiced",
  "paid",
];

function dealProgress(status: string): number {
  const idx = STAGE_ORDER.indexOf(status);
  return idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

function daysSinceIso(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

function sinceLabel(deals: DealFull[]): string | null {
  const timestamps = deals
    .filter((d) => ALT.has(d.status))
    .map((d) => new Date(d.created_at).getTime())
    .sort((a, b) => a - b);
  if (!timestamps.length) return null;
  return new Date(timestamps[0]).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub: string | null;
}) {
  return (
    <Card className="rounded-2xl p-5 gap-0">
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-3 gap-0">
        <CardTitle className="text-sm font-semibold text-foreground">
          {label}
        </CardTitle>
        <Button variant="outline" size="icon-sm">
          <ArrowUpRight />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <span className="text-3xl font-light tracking-tight">{value}</span>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Shared cell components ─────────────────────────────────────────────────────

function BrandCell({ deal }: { deal: DealFull }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {deal.brands ? (
        <BrandAvatar brand={deal.brands} />
      ) : (
        <span className="w-6 h-6 rounded-md shrink-0 bg-muted" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate leading-tight">
          {deal.title}
        </p>
        {deal.brands && (
          <p className="text-[10px] text-muted-foreground truncate">
            {deal.brands.company_name}
          </p>
        )}
      </div>
    </div>
  );
}

function PlatformCell({ deal }: { deal: DealFull }) {
  const firstDeliverable = deal.deliverables[0];
  const platformStr = deal.platform
    ? deal.platform
    : firstDeliverable
      ? (typeof firstDeliverable === "string" ? firstDeliverable : firstDeliverable.platform)
      : null;
  const key = platformStr ? (PLATFORM_KEY[platformStr] ?? null) : null;

  if (!key) return <span className="text-muted-foreground/40 text-xs">—</span>;

  const label =
    key === "youtube" ? "YouTube" : key.charAt(0).toUpperCase() + key.slice(1);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm leading-none opacity-50">
        {PLATFORM_ICONS[key] ?? null}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status];
  if (!style) return null;
  return (
    <span
      className={cn(
        "text-[9px] font-medium px-2 py-0.5 rounded-full",
        style.bg,
        style.text,
      )}
    >
      {style.label}
    </span>
  );
}

// ── Laufende Deals columns ─────────────────────────────────────────────────────

const laufendColumns: ColumnDef<DealFull>[] = [
  {
    id: "brand",
    header: "Deal",
    accessorFn: (row) => row.brands?.company_name ?? row.title,
    cell: ({ row }) => <BrandCell deal={row.original} />,
    size: 200,
    enableHiding: false,
  },
  {
    id: "platform",
    header: "Plattform",
    accessorFn: (row) => row.platform,
    cell: ({ row }) => <PlatformCell deal={row.original} />,
    size: 130,
    enableSorting: false,
  },
  {
    id: "progress",
    header: "Fortschritt",
    accessorFn: (row) => dealProgress(row.status),
    cell: ({ row }) => {
      const pct = dealProgress(row.original.status);
      return (
        <div className="h-1.5 w-full max-w-32 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
      );
    },
    size: 140,
    enableSorting: false,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    size: 110,
  },
  {
    id: "budget",
    header: "Budget",
    accessorKey: "budget",
    cell: ({ row }) => (
      <span className="text-xs font-medium tabular-nums">
        {fmtMoney(Number(row.original.budget))}
      </span>
    ),
    size: 90,
  },
  {
    id: "deadline",
    header: "Deadline",
    accessorKey: "deadline",
    cell: ({ row }) => {
      const { deadline } = row.original;
      if (!deadline)
        return <span className="text-muted-foreground/40 text-xs">—</span>;
      const days = daysUntil(deadline);
      return (
        <span
          className={cn(
            "text-[10px] flex items-center gap-0.5",
            days < 0 || days <= 3
              ? "text-red-500"
              : days <= 7
                ? "text-yellow-600"
                : "text-muted-foreground",
          )}
        >
          <Clock className="w-2.5 h-2.5" />
          {fmtDate(deadline)}
        </span>
      );
    },
    size: 100,
  },
];

// ── Sortable table wrapper ─────────────────────────────────────────────────────

function DealsTable({
  data,
  columns,
  title,
  action,
  badge,
  emptyText,
  onRowClick,
  onEdit,
  onDelete,
}: {
  data: DealFull[];
  columns: ColumnDef<DealFull>[];
  title: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  emptyText: string;
  onRowClick?: (deal: DealFull) => void;
  onEdit?: (deal: DealFull) => void;
  onDelete?: (deal: DealFull) => void;
}) {
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>([]);

  const actionsColumn: ColumnDef<DealFull> = {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div
        className="flex items-center justify-end gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onEdit?.(row.original)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete?.(row.original)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    ),
    size: 72,
    enableSorting: false,
  };

  const allColumns = [...columns, actionsColumn];

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    state: { sorting },
  });

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {badge}
        </div>
        {action}
      </div>

      <AnimatedHeight>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {emptyText}
          </p>
        ) : (
        <div className="overflow-y-auto max-h-87.5 rounded-xl">
          <Table className="table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className="sticky top-0 z-10 bg-card h-9 text-[10px] uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className="flex items-center gap-1 cursor-pointer select-none"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: <ChevronUp className="w-3 h-3 opacity-60" />,
                            desc: (
                              <ChevronDown className="w-3 h-3 opacity-60" />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
      </AnimatedHeight>
    </Card>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function DealsTab({
  deals,
  anfragen,
  creator,
  creatorId,
}: {
  deals: DealFull[];
  anfragen: Anfrage[];
  creator: Creator | null;
  creatorId: string;
}) {
  const router = useRouter();
  const [selectedDeal, setSelectedDeal] = useState<DealFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DealFull | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [showAlt, setShowAlt] = useState(false);

  const visibleDeals = deals.filter((d) => !deletedIds.has(d.id));

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/deals/${deleteTarget.id}`, { method: "DELETE" });
      setDeletedIds((prev) => new Set([...prev, deleteTarget.id]));
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  const laufend = visibleDeals.filter((d) => LAUFEND.has(d.status));
  const alt = visibleDeals.filter((d) => ALT.has(d.status));
  const activeAnfragen = anfragen.filter(
    (a) => a.status !== "gewonnen" && a.status !== "abgelehnt",
  );

  const activeBudget = laufend.reduce((s, d) => s + Number(d.budget), 0);
  const since = sinceLabel(visibleDeals);

  type Alert = { label: string; detail: string };
  const alerts: Alert[] = [
    ...laufend
      .filter((d) => d.deadline && daysUntil(d.deadline) <= 3)
      .map((d) => {
        const days = daysUntil(d.deadline!);
        const detail =
          days < 0
            ? `Deadline überschritten (${Math.abs(days)}T)`
            : days === 0
              ? "Deadline heute"
              : `Deadline in ${days} Tag${days === 1 ? "" : "en"}`;
        return { label: d.brands?.company_name ?? d.title, detail };
      }),
    ...anfragen
      .filter((a) => {
        const isEnd = a.status === "gewonnen" || a.status === "abgelehnt";
        const days = daysSinceIso(a.created_at);
        return !isEnd && days > 3;
      })
      .map((a) => {
        const days = daysSinceIso(a.created_at);
        return {
          label: a.brands?.company_name ?? a.brand_name ?? "Unbekannte Brand",
          detail: `Anfrage seit ${days} Tagen offen`,
        };
      }),
  ];

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* Urgent alerts banner */}
      {alerts.length > 0 && (
        <div className="rounded-xl bg-red-500/8 border border-red-200/60 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-semibold">Handlungsbedarf</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[11px] bg-red-500/10 text-red-700 rounded-lg px-2.5 py-1"
              >
                <span className="font-medium">{a.label}</span>
                <span className="opacity-70">·</span>
                <span>{a.detail}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Laufende Deals"
          value={laufend.length}
          sub={`${fmtMoney(activeBudget)} Volumen`}
        />
        <StatCard
          label="Offene Anfragen"
          value={activeAnfragen.length}
          sub={
            activeAnfragen.length > 0
              ? `${anfragen.filter((a) => a.status === "verhandlung").length} in Verhandlung`
              : "Keine offenen Anfragen"
          }
        />
        <StatCard
          label="Abgeschlossene Kooperationen"
          value={alt.length}
          sub={since ? `seit ${since}` : null}
        />
      </div>

      {/* Laufende Deals */}
      <DealsTable
        data={showAlt ? alt : laufend}
        columns={laufendColumns}
        title="Deals"
        emptyText={
          showAlt ? "Keine abgeschlossenen Deals" : "Keine laufenden Deals"
        }
        onRowClick={setSelectedDeal}
        onEdit={(d) => router.push(`/creators/deals/edit/${d.id}`)}
        onDelete={setDeleteTarget}
        action={
          <div className="flex items-center gap-2">
            <SegmentedControl
              value={showAlt ? "abgeschlossen" : "laufend"}
              onChange={(v) => setShowAlt(v === "abgeschlossen")}
              options={[
                { value: "laufend", label: "Laufend" },
                {
                  value: "abgeschlossen",
                  label:
                    alt.length > 0
                      ? `Abgeschlossen (${alt.length})`
                      : "Abgeschlossen",
                },
              ]}
            />
            <Button variant="default" className="gap-1.5 h-7 text-xs">
              <Plus className="w-3 h-3" />
              Neuer Deal
            </Button>
          </div>
        }
      />

      {/* Anfragen (incoming deal inquiries) */}
      <AnfragenPanel initialAnfragen={anfragen} creatorId={creatorId} />

      {/* Deal detail dialog */}
      <DealDialog
        deal={selectedDeal}
        creatorName={creator?.full_name}
        open={selectedDeal !== null}
        onClose={() => setSelectedDeal(null)}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deal löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.title}
            </span>{" "}
            wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig
            gemacht werden.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
            >
              {deleteLoading ? "Löschen…" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
