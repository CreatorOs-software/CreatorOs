"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Puzzle,
  Star,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { QueryKeys } from "@/lib/query-keys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarCreator } from "@/components/ui/avatar-creator";
import { Auflister } from "@/components/ui/auflister";
import { CreatorCard, formatMoney } from "@/components/creators/creator-card";
import {
  CreatorSheet,
  type Creator,
} from "@/components/creators/creator-sheet";
import { PlatformSheet } from "@/components/creators/platform-sheet";
import type { CreatorsPageData } from "@/domains/creators";

// ─── Table columns ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  "on-break": "Pause",
  inactive: "Inaktiv",
};

function buildColumns(
  activePerCreator: (id: string) => number,
  todoCountPerCreator: (id: string) => number,
  onOpenSheet: (id: string) => void,
  onOpenPlatformSheet: (id: string) => void,
): ColumnDef<Creator>[] {
  return [
    {
      accessorKey: "full_name",
      header: "Name",
      size: 220,
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <AvatarCreator initials={row.original.initials} size="sm" />
          <span className="font-medium">{row.original.full_name}</span>
        </span>
      ),
    },
    {
      accessorKey: "handle",
      header: "Handle",
      size: 140,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {(getValue() as string | null) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 100,
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return s === "active" ? (
          <Badge className="bg-secondary text-secondary-foreground hover:bg-orange-100">
            {STATUS_LABEL[s]}
          </Badge>
        ) : (
          <Badge variant="secondary">{STATUS_LABEL[s] ?? s}</Badge>
        );
      },
    },
    {
      accessorKey: "niche",
      header: "Nische",
      size: 180,
      cell: ({ getValue }) => {
        const niches = getValue() as string[];
        return (
          <span className="text-sm text-muted-foreground">
            {niches.slice(0, 2).join(", ") || "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "followers",
      header: "Followers",
      size: 110,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-sm">
          {(getValue() as string | null) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "monthly_revenue",
      header: "MTD",
      size: 90,
      cell: ({ getValue }) => (
        <span className="tabular-nums text-sm font-medium">
          {formatMoney(getValue() as number)}
        </span>
      ),
    },
    {
      id: "active_deals",
      header: "Deals",
      size: 70,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {activePerCreator(row.original.id)}
        </span>
      ),
    },
    {
      id: "todos",
      header: "Todos",
      size: 70,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {todoCountPerCreator(row.original.id)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 80,
      enableSorting: false,
      cell: ({ row }) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onOpenPlatformSheet(row.original.id)}
          >
            <Puzzle className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onOpenSheet(row.original.id)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/creators/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Löschen fehlgeschlagen");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.creators.all() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.creators.list() });
    },
  });

  const { data: listData, isPending } = useQuery<{ creators: Creator[] }>({
    queryKey: QueryKeys.creators.list(),
    queryFn: () => fetch("/api/creators/list").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: allData } = useQuery<CreatorsPageData>({
    queryKey: QueryKeys.creators.all(),
    queryFn: () => fetch("/api/creators").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: todosData } = useQuery<{
    todos: { assignee?: { id: string } | null; done: boolean }[];
  }>({
    queryKey: QueryKeys.todos.all(),
    queryFn: () => fetch("/api/todos").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  const creators: Creator[] = allData?.creators ?? [];
  const deals = allData?.deals ?? [];

  const todoCountPerCreator = (id: string) =>
    (todosData?.todos ?? []).filter((t) => !t.done && t.assignee?.id === id)
      .length;

  const activePerCreator = (id: string) =>
    deals.filter(
      (d) => d.creator_id === id && !["paid", "posted"].includes(d.status),
    ).length;

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [platformId, setPlatformId] = useState<string | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCardClick(id: string) {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      router.push(`/creators/dashboard/${id}`);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        setProfileId(id);
      }, 220);
    }
  }

  const filtered = (listData?.creators ?? []).filter(
    (c) =>
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.handle?.toLowerCase().includes(search.toLowerCase()) ||
      c.niche.some((n) => n.toLowerCase().includes(search.toLowerCase())),
  );

  const totalMtd = creators.reduce((s, c) => s + Number(c.monthly_revenue), 0);
  const totalActive = creators.reduce((s, c) => s + activePerCreator(c.id), 0);

  const profile = profileId
    ? (creators.find((c) => c.id === profileId) ?? null)
    : null;

  const columns = buildColumns(
    activePerCreator,
    todoCountPerCreator,
    (id) => setProfileId(id),
    (id) => setPlatformId(id),
  );

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-3 mb-4 mt-1">
        <div>
          <h1 className="text-base font-semibold">Creator</h1>
          <p className="text-xs text-muted-foreground">
            {creators.length} Creator · {totalActive} aktive Deals ·{" "}
            {formatMoney(totalMtd)} MTD
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`flex h-8 w-8 items-center justify-center transition-colors ${
                view === "grid"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              aria-label="Kartenansicht"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex h-8 w-8 items-center justify-center transition-colors ${
                view === "table"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              aria-label="Tabellenansicht"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {view === "grid" && (
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen…"
              className="w-44"
            />
          )}

          <Button
            onClick={() => router.push("/creators/create-form")}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
          >
            <Plus className="w-4 h-4" />
            Creator hinzufügen
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        {view === "table" ? (
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <Auflister
              data={creators}
              columns={columns}
              emptyText="Noch keine Creator."
              searchPlaceholder="Suchen…"
              pagination
              onRowClick={(c) => router.push(`/creators/dashboard/${c.id}`)}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Star className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {search
                ? "Kein Creator gefunden."
                : "Noch keine Creator. Füge den ersten hinzu!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            {filtered.map((c) => (
              <CreatorCard
                key={c.id}
                c={c}
                activeDeals={activePerCreator(c.id)}
                todoCount={todoCountPerCreator(c.id)}
                onOpenSheet={() => handleCardClick(c.id)}
                onOpenPlatformSheet={() => setPlatformId(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreatorSheet
        creator={profile}
        deals={deals}
        open={!!profileId}
        onOpenChange={(open) => {
          if (!open) setProfileId(null);
        }}
        onDelete={async (id) => {
          await deleteMutation.mutateAsync(id);
          setProfileId(null);
        }}
      />
      <PlatformSheet
        creator={creators.find((c) => c.id === platformId) ?? null}
        open={!!platformId}
        onOpenChange={(open) => {
          if (!open) setPlatformId(null);
        }}
      />
    </div>
  );
}
