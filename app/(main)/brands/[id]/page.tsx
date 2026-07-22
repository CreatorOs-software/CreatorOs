"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Auflister } from "@/components/ui/auflister";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { usePageHeader } from "@/components/layout/page-header-context";
import {
  STATUS_STYLE,
  fmtDate,
  fmtMoney,
} from "@/components/creators/dashboard/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Types ──────────────────────────────────────────────────────────────────────

type CreatorMin = {
  id: string;
  full_name: string;
  initials: string;
  color: string;
};

type DealRow = {
  id: string;
  title: string;
  budget: number;
  status: string;
  deadline: string | null;
  campaign_type: string | null;
  usage_rights: string | null;
  exclusivity: string | null;
  created_at: string;
  creators: CreatorMin | null;
};

type AnfrageRow = {
  id: string;
  format: string | null;
  budget_requested: number | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  creators: CreatorMin | null;
};

type CreatorSummary = {
  creator: CreatorMin;
  deals: DealRow[];
  anfragen: AnfrageRow[];
  has_active_deal: boolean;
  total_revenue: number;
  only_contact: boolean;
};

type BrandContact = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};

type BrandDetail = {
  id: string;
  company_name: string;
  short_code: string;
  color: string;
  industry: string | null;
  notes: string | null;
  created_at: string;
};

type BrandDetailResponse = {
  brand: BrandDetail;
  contacts: BrandContact[];
  creator_summaries: CreatorSummary[];
  all_deals: DealRow[];
  gap_creators: CreatorMin[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const LAUFEND = new Set([
  "confirmed",
  "production",
  "approval",
  "scheduled",
  "posted",
]);
const ALT = new Set(["invoiced", "paid"]);

const ANFRAGE_STATUS: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  neu: { label: "Neu", bg: "bg-muted", text: "text-muted-foreground" },
  pruefung: {
    label: "In Prüfung",
    bg: "bg-blue-500/15",
    text: "text-blue-600",
  },
  angebot: {
    label: "Angebot",
    bg: "bg-violet-500/15",
    text: "text-violet-600",
  },
  verhandlung: {
    label: "Verhandlung",
    bg: "bg-amber-400/15",
    text: "text-amber-700",
  },
  zugesagt: {
    label: "Zugesagt",
    bg: "bg-green-500/15",
    text: "text-green-700",
  },
  gewonnen: {
    label: "Gewonnen",
    bg: "bg-emerald-500/20",
    text: "text-emerald-700",
  },
  abgelehnt: { label: "Abgelehnt", bg: "bg-red-500/15", text: "text-red-600" },
};

// ── Small shared components ────────────────────────────────────────────────────

function BrandAvatar({
  color,
  short_code,
  size = "lg",
}: {
  color: string;
  short_code: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "rounded-xl shrink-0 inline-flex items-center justify-center font-bold text-white",
        size === "sm" && "w-7 h-7 text-[10px] rounded-lg",
        size === "md" && "w-9 h-9 text-xs rounded-lg",
        size === "lg" && "w-14 h-14 text-xl",
      )}
      style={{ background: color }}
    >
      {short_code}
    </span>
  );
}

function CreatorAvatar({ creator }: { creator: CreatorMin }) {
  return (
    <span
      className="w-8 h-8 rounded-full shrink-0 inline-flex items-center justify-center text-white text-[10px] font-bold"
      style={{ background: creator.color }}
    >
      {creator.initials}
    </span>
  );
}

function DealStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status];
  if (!s) return null;
  return (
    <span
      className={cn(
        "text-[9px] font-medium px-2 py-0.5 rounded-full",
        s.bg,
        s.text,
      )}
    >
      {s.label}
    </span>
  );
}

function AnfrageStatusBadge({ status }: { status: string }) {
  const s = ANFRAGE_STATUS[status];
  if (!s) return null;
  return (
    <span
      className={cn(
        "text-[9px] font-medium px-2 py-0.5 rounded-full",
        s.bg,
        s.text,
      )}
    >
      {s.label}
    </span>
  );
}

// ── Creator History Dialog ─────────────────────────────────────────────────────

function CreatorHistoryDialog({
  summary,
  brandName,
  open,
  onClose,
}: {
  summary: CreatorSummary | null;
  brandName: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!summary) return null;
  const { creator, deals, anfragen } = summary;
  const failedAnfragen = anfragen.filter((a) => a.status === "abgelehnt");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreatorAvatar creator={creator} />
            {creator.full_name} × {brandName}
          </DialogTitle>
        </DialogHeader>

        {deals.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Deals
            </p>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
              {deals.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtDate(d.created_at)}
                      {d.campaign_type ? ` · ${d.campaign_type}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium tabular-nums">
                      {fmtMoney(Number(d.budget))}
                    </span>
                    <DealStatusBadge status={d.status} />
                    <Button variant="ghost" size="icon-sm">
                      <Link
                        href={
                          d.creators?.id
                            ? `/creators/dashboard/${d.creators.id}`
                            : "#"
                        }
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {failedAnfragen.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Anfragen ohne Deal
            </p>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden bg-muted/30">
              {failedAnfragen.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {a.format ?? "Format unbekannt"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtDate(a.created_at)}
                      {a.rejection_reason ? ` · ${a.rejection_reason}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.budget_requested != null && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {fmtMoney(a.budget_requested)}
                      </span>
                    )}
                    <AnfrageStatusBadge status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {deals.length === 0 && failedAnfragen.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Noch keine abgeschlossene Zusammenarbeit.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Creator Section ────────────────────────────────────────────────────────────

function CreatorSection({
  summaries,
  brandName,
}: {
  summaries: CreatorSummary[];
  brandName: string;
}) {
  const [selected, setSelected] = useState<CreatorSummary | null>(null);

  return (
    <>
      <Card className="p-5 gap-0 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Creator mit dieser Brand</h3>
          {summaries.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {summaries.length}
            </span>
          )}
        </div>

        {summaries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Noch keine Creator mit dieser Brand verknüpft.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-1">
                Creator
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-44 shrink-0">
                Deals · Umsatz
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-40 shrink-0">
                Status
              </p>
              <div className="w-4 shrink-0" />
            </div>

            <div className="flex flex-col divide-y divide-border -mx-5">
              {summaries.map((s) => (
                <button
                  key={s.creator.id}
                  onClick={() => setSelected(s)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CreatorAvatar creator={s.creator} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.creator.full_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        @{s.creator.full_name.toLowerCase().replace(/\s+/g, "")}
                      </p>
                    </div>
                  </div>

                  <div className="w-44 shrink-0">
                    <span className="text-sm">
                      {s.only_contact
                        ? "Nur Anfragen"
                        : `${s.deals.length} Deal${s.deals.length !== 1 ? "s" : ""} · ${fmtMoney(s.total_revenue)}`}
                    </span>
                  </div>

                  <div className="w-40 shrink-0">
                    {s.only_contact ? (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Nur Anfrage
                      </span>
                    ) : s.has_active_deal ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-700 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        aktiver Deal läuft
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                        abgeschlossen
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      <CreatorHistoryDialog
        summary={selected}
        brandName={brandName}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

// ── Contact Dialog ─────────────────────────────────────────────────────────────

function ContactDialog({
  open,
  onClose,
  editing,
  brandId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: BrandContact | null;
  brandId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [role, setRole] = useState(editing?.role ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        role: role.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      };
      if (editing) {
        await fetch(`/api/brands/contacts/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/brands/${brandId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
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
          <DialogTitle>
            {editing ? "Kontakt bearbeiten" : "Ansprechpartner hinzufügen"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Name *
            </label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Muster"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Rolle
            </label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Marketing, Buchhaltung, Agentur …"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                E-Mail
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m.muster@brand.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Telefon
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 …"
              />
            </div>
          </div>
          <DialogFooter className="mt-1">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Contacts Section ───────────────────────────────────────────────────────────

function ContactsSection({
  contacts,
  brandId,
  onRefresh,
}: {
  contacts: BrandContact[];
  brandId: string;
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BrandContact | null>(null);

  async function handleDelete(id: string) {
    await fetch(`/api/brands/contacts/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <>
      <Card className="p-5 gap-0 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Ansprechpartner</h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 px-2.5"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-3 h-3" />
            Hinzufügen
          </Button>
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Noch keine Ansprechpartner
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-2 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium leading-tight">{c.name}</p>
                    {c.role && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                        {c.role}
                      </span>
                    )}
                  </div>
                  {(c.email || c.phone) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {[c.email, c.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditing(c);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ContactDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        brandId={brandId}
        onSaved={onRefresh}
      />
    </>
  );
}

// ── Deal History Section ───────────────────────────────────────────────────────

const dealHistoryColumns: ColumnDef<DealRow>[] = [
  {
    id: "datum",
    header: "Datum",
    accessorKey: "created_at",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {fmtDate(row.original.created_at)}
      </span>
    ),
    size: 112,
  },
  {
    id: "creator",
    header: "Creator",
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original.creators;
      if (!c)
        return <span className="text-muted-foreground/40 text-xs">—</span>;
      return (
        <div className="flex items-center gap-2">
          <CreatorAvatar creator={c} />
          <span className="text-xs font-medium truncate">{c.full_name}</span>
        </div>
      );
    },
  },
  {
    id: "kampagne",
    header: "Kampagne",
    enableSorting: false,
    cell: ({ row }) => {
      const d = row.original;
      return (
        <div>
          <p className="text-xs font-medium truncate">{d.title}</p>
          {d.campaign_type && (
            <p className="text-[10px] text-muted-foreground">
              {d.campaign_type}
            </p>
          )}
        </div>
      );
    },
  },
  {
    id: "honorar",
    header: "Honorar",
    accessorKey: "budget",
    cell: ({ row }) => (
      <span className="text-xs font-medium tabular-nums">
        {fmtMoney(Number(row.original.budget))}
      </span>
    ),
    size: 96,
  },
  {
    id: "status",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => <DealStatusBadge status={row.original.status} />,
    size: 96,
  },
  {
    id: "link",
    header: "",
    enableSorting: false,
    cell: ({ row }) => {
      const creatorId = row.original.creators?.id;
      if (!creatorId) return null;
      return (
        <div
          className="flex justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/creators/dashboard/${creatorId}`}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
          </Link>
        </div>
      );
    },
    size: 40,
  },
];

function DealHistorySection({ deals }: { deals: DealRow[] }) {
  const [showAlt, setShowAlt] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState<Set<string>>(new Set());

  const availableCreators = [
    ...new Set(
      deals.map((d) => d.creators?.full_name).filter(Boolean) as string[],
    ),
  ].sort();

  const filteredDeals = deals.filter(
    (d) =>
      creatorFilter.size === 0 ||
      creatorFilter.has(d.creators?.full_name ?? ""),
  );
  const alt = filteredDeals.filter((d) => ALT.has(d.status));
  const laufend = filteredDeals.filter((d) => !ALT.has(d.status));
  const visible = showAlt ? alt : laufend;

  if (deals.length === 0) return null;

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <h3 className="text-sm font-semibold mb-3">Deal-Historie</h3>
      <Auflister
        data={visible}
        columns={dealHistoryColumns}
        emptyText={
          showAlt ? "Keine abgeschlossenen Deals" : "Keine laufenden Deals"
        }
        searchPlaceholder="Deal suchen…"
        filterContent={
          availableCreators.length > 1 ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                Creator
              </p>
              {availableCreators.map((name) => (
                <label
                  key={name}
                  className="flex items-center gap-2 cursor-pointer rounded px-1 py-1 hover:bg-muted/50 text-xs"
                >
                  <Checkbox
                    checked={creatorFilter.has(name)}
                    onCheckedChange={(checked) =>
                      setCreatorFilter((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(name);
                        else next.delete(name);
                        return next;
                      })
                    }
                  />
                  {name}
                </label>
              ))}
              {creatorFilter.size > 0 && (
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground mt-2 px-1 text-left"
                  onClick={() => setCreatorFilter(new Set())}
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          ) : undefined
        }
        activeFilterCount={creatorFilter.size}
        filterLeft={
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
        }
      />
    </Card>
  );
}

// ── Gap Section ────────────────────────────────────────────────────────────────

function GapSection({ creators }: { creators: CreatorMin[] }) {
  if (creators.length === 0) return null;

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <h3 className="text-sm font-semibold mb-1">
        Hat noch nicht zusammengearbeitet mit
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Klick legt eine Anfrage in der Pipeline an.
      </p>
      <div className="flex flex-wrap gap-2">
        {creators.map((c) => (
          <Link
            key={c.id}
            href={`/creators/dashboard/${c.id}`}
            className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted transition-colors text-xs font-medium"
          >
            <span
              className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white text-[9px] font-bold shrink-0"
              style={{ background: c.color }}
            >
              {c.initials}
            </span>
            {c.full_name}
            <span className="text-muted-foreground/60 ml-0.5">+</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Notes Section ──────────────────────────────────────────────────────────────

function NotesSection({
  brandId,
  initialNotes,
}: {
  brandId: string;
  initialNotes: string | null;
}) {
  const [value, setValue] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value || null }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 gap-0 rounded-2xl">
      <h3 className="text-sm font-semibold mb-3">Notizen zur Brand</h3>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Freigaben dauern immer 2 Wochen, zahlt zuverlässig, Budget-Range 3–5k …"
        className="resize-none"
      />
      <div className="flex justify-end mt-3">
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setConfig } = usePageHeader();

  const { data, isPending } = useQuery<BrandDetailResponse>({
    queryKey: ["brand-detail", id],
    queryFn: () => fetch(`/api/brands/${id}`).then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  const brandName = data?.brand?.company_name;

  useEffect(() => {
    if (!brandName) return;
    setConfig({
      onBack: () => router.push("/brands"),
      title: brandName,
    });
    return () => setConfig(null);
  }, [brandName]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["brand-detail", id] });
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.brand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-muted-foreground">Brand nicht gefunden.</p>
        <Button variant="outline" onClick={() => router.push("/brands")}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Zurück zu Brands
        </Button>
      </div>
    );
  }

  const { brand, contacts, creator_summaries, all_deals, gap_creators } = data;

  const totalRevenue = all_deals
    .filter((d) => LAUFEND.has(d.status) || ALT.has(d.status))
    .reduce((s, d) => s + Number(d.budget), 0);
  const activeDeals = all_deals.filter((d) => LAUFEND.has(d.status));

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Header card */}
      <Card className="rounded-2xl p-6 gap-0">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <BrandAvatar color={brand.color} short_code={brand.short_code} />
            <div>
              <h1 className="text-xl font-semibold leading-tight">
                {brand.company_name}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Partner seit {fmtDate(brand.created_at)} ·{" "}
                {creator_summaries.length} Creator im Roster aktiv
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-4 shrink-0">
            {(() => {
              const emails = contacts
                .map((c) => c.email)
                .filter(Boolean) as string[];
              return (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  disabled={emails.length === 0}
                  onClick={() => {
                    if (emails.length > 0)
                      window.location.href = `mailto:${emails.join(",")}`;
                  }}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Kontaktieren
                </Button>
              );
            })()}
            <div className="flex items-center gap-10">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Deals gesamt
                </p>
                <p className="text-2xl font-bold mt-0.5">{all_deals.length}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Umsatz gesamt
                </p>
                <p className="text-2xl font-bold mt-0.5">
                  {fmtMoney(totalRevenue)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Aktive Deals
                </p>
                <p className="text-2xl font-bold mt-0.5">
                  {activeDeals.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_360px] gap-5 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <CreatorSection
            summaries={creator_summaries}
            brandName={brand.company_name}
          />
          <DealHistorySection deals={all_deals} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <ContactsSection contacts={contacts} brandId={id} onRefresh={refresh} />
          <GapSection creators={gap_creators} />
          <NotesSection brandId={id} initialNotes={brand.notes} />
        </div>
      </div>
    </div>
  );
}
