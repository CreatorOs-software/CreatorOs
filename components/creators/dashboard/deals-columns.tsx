import { Clock } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { TableProgress } from "@/components/ui/table-progress";
import type { DealFull } from "./types";
import {
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

export function dealProgress(status: string): number {
  const idx = STAGE_ORDER.indexOf(status);
  return idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

// ── Cell components ────────────────────────────────────────────────────────────

export function BrandCell({ deal }: { deal: DealFull }) {
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

export function PlatformCell({ deal }: { deal: DealFull }) {
  const firstDeliverable = deal.deliverables[0];
  const platformStr = deal.platform
    ? deal.platform
    : firstDeliverable
      ? typeof firstDeliverable === "string"
        ? firstDeliverable
        : firstDeliverable.platform
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

export function StatusBadge({ status }: { status: string }) {
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

// ── Column definitions ─────────────────────────────────────────────────────────

export const laufendColumns: ColumnDef<DealFull>[] = [
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
      return <TableProgress value={pct} segments={10} />;
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
