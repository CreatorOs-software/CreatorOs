"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  PIPELINE,
  PLATFORM_ICONS,
  PLATFORM_KEY,
  STATUS_STYLE,
  daysUntil,
  fmtDate,
  fmtMoney,
} from "./constants";
import { BrandAvatar } from "./shared";

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
    <Card className="px-5 py-4 gap-0.5 rounded-2xl">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-2xl font-light leading-tight">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
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
  const key = deal.platform
    ? deal.platform
    : deal.deliverables[0]
      ? (PLATFORM_KEY[deal.deliverables[0]] ?? null)
      : null;

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

// ── Pipeline columns ───────────────────────────────────────────────────────────

const pipelineColumns: ColumnDef<DealFull>[] = [
  {
    id: "brand",
    header: "Brand",
    accessorFn: (row) => row.brands?.company_name ?? row.title,
    cell: ({ row }) => {
      const deal = row.original;
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          {deal.brands ? (
            <BrandAvatar brand={deal.brands} />
          ) : (
            <span className="w-6 h-6 rounded-md shrink-0 bg-muted" />
          )}
          <p className="text-xs font-medium truncate">
            {deal.brands?.company_name ?? deal.title}
          </p>
        </div>
      );
    },
    size: 180,
    enableHiding: false,
  },
  {
    id: "title",
    header: "Deal",
    accessorKey: "title",
    cell: ({ row }) => (
      <p className="text-xs text-muted-foreground truncate">
        {row.original.title}
      </p>
    ),
    size: 180,
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
      <span className="text-xs tabular-nums text-muted-foreground">
        {fmtMoney(Number(row.original.budget))}
      </span>
    ),
    size: 90,
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
}: {
  data: DealFull[];
  columns: ColumnDef<DealFull>[];
  title: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  emptyText: string;
}) {
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
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

      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          {emptyText}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl  ">
          <Table className="table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className="h-9 text-[10px] uppercase tracking-wider"
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
                <TableRow key={row.id}>
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
    </Card>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────

export function DealsTab({
  deals,
  creator,
}: {
  deals: DealFull[];
  creator: Creator | null;
}) {
  const laufend = deals.filter((d) => LAUFEND.has(d.status));
  const pipeline = deals.filter((d) => PIPELINE.has(d.status));
  const alt = deals.filter((d) => ALT.has(d.status));

  const activeBudget = laufend.reduce((s, d) => s + Number(d.budget), 0);
  const pipelineBudget = pipeline.reduce((s, d) => s + Number(d.budget), 0);
  const since = sinceLabel(deals);
  const verhandlung = pipeline.filter((d) => d.status === "negotiation").length;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Laufende Deals"
          value={laufend.length}
          sub={`${fmtMoney(activeBudget)} Volumen`}
        />
        <StatCard
          label="Ausstehende Zahlung"
          value={fmtMoney(pipelineBudget)}
          sub={
            verhandlung > 0
              ? `${verhandlung} Deal${verhandlung > 1 ? "s" : ""} in Verhandlung`
              : `${pipeline.length} Deal${pipeline.length !== 1 ? "s" : ""}`
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
        data={laufend}
        columns={laufendColumns}
        title="Laufende Deals"
        emptyText="Keine laufenden Deals"
        action={
          <Button variant="default" className="gap-1.5 h-7 text-xs">
            <Plus className="w-3 h-3" />
            Neuer Deal
          </Button>
        }
      />

      {/* Pipeline */}
      <DealsTable
        data={pipeline}
        columns={pipelineColumns}
        title="Pipeline"
        emptyText="Keine Deals in der Pipeline"
        badge={
          pipeline.length > 0 ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 text-[9px] font-medium">
              {pipeline.length}
            </span>
          ) : null
        }
      />
    </div>
  );
}
