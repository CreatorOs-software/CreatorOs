import { Clock } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { Anfrage } from "./types";
import { fmtMoney } from "./constants";

// ── Constants ──────────────────────────────────────────────────────────────────

export const STATUS_META: Record<
  Anfrage["status"],
  { label: string; bg: string; text: string }
> = {
  neu: { label: "Neu", bg: "bg-zinc-100", text: "text-zinc-600" },
  pruefung: { label: "In Prüfung", bg: "bg-blue-500/15", text: "text-blue-600" },
  angebot: { label: "Angebot raus", bg: "bg-violet-500/15", text: "text-violet-600" },
  verhandlung: { label: "In Verhandlung", bg: "bg-amber-400/15", text: "text-amber-700" },
  zugesagt: { label: "Zugesagt", bg: "bg-green-500/15", text: "text-green-700" },
  gewonnen: { label: "Gewonnen", bg: "bg-emerald-500/20", text: "text-emerald-700" },
  abgelehnt: { label: "Abgelehnt", bg: "bg-red-500/15", text: "text-red-600" },
};

// ── Cell components ────────────────────────────────────────────────────────────

export function AnfrageBrandAvatar({ anfrage }: { anfrage: Anfrage }) {
  const color = anfrage.brands?.color ?? "#6b7280";
  const code =
    anfrage.brands?.short_code ??
    anfrage.brand_name?.slice(0, 2).toUpperCase() ??
    "?";
  return (
    <span
      className="w-6 h-6 rounded-md shrink-0 inline-flex items-center justify-center text-white text-[9px] font-bold"
      style={{ background: color }}
    >
      {code}
    </span>
  );
}

export function AnfrageStatusBadge({ status }: { status: Anfrage["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "text-[9px] font-medium px-2 py-0.5 rounded-full",
        meta.bg,
        meta.text,
      )}
    >
      {meta.label}
    </span>
  );
}

function DaysCell({ isoDate }: { isoDate: string }) {
  const d = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  return (
    <span
      className={cn(
        "text-[10px] flex items-center gap-0.5",
        d >= 4 ? "text-red-500" : "text-muted-foreground",
      )}
    >
      <Clock className="w-2.5 h-2.5" />
      {d === 0 ? "heute" : `${d}T`}
    </span>
  );
}

// ── Column definitions ─────────────────────────────────────────────────────────

export const anfrageColumns: ColumnDef<Anfrage>[] = [
  {
    id: "brand",
    header: "Brand",
    accessorFn: (row) => row.brands?.company_name ?? row.brand_name ?? "",
    cell: ({ row }) => {
      const a = row.original;
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <AnfrageBrandAvatar anfrage={a} />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate leading-tight">
              {a.brands?.company_name ?? a.brand_name ?? "—"}
            </p>
            {a.contact_person && (
              <p className="text-[10px] text-muted-foreground truncate">
                {a.contact_person}
              </p>
            )}
          </div>
        </div>
      );
    },
    size: 180,
  },
  {
    id: "format",
    header: "Format",
    accessorKey: "format",
    cell: ({ row }) => (
      <p className="text-xs text-muted-foreground truncate">
        {row.original.format ?? "—"}
      </p>
    ),
    size: 160,
  },
  {
    id: "budget",
    header: "Budget",
    accessorKey: "budget_requested",
    cell: ({ row }) => {
      const { budget_requested, budget_offer } = row.original;
      return (
        <div>
          <p className="text-xs tabular-nums font-medium">
            {budget_requested != null ? fmtMoney(budget_requested) : "—"}
          </p>
          {budget_offer != null && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              Angebot: {fmtMoney(budget_offer)}
            </p>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => <AnfrageStatusBadge status={row.original.status} />,
    size: 120,
  },
  {
    id: "days",
    header: "Liegt seit",
    accessorKey: "created_at",
    cell: ({ row }) => <DaysCell isoDate={row.original.created_at} />,
    size: 90,
  },
];
