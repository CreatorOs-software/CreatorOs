"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Inbox, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SiInstagram,
  SiOnlyfans,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Creator = {
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

export type Brand = {
  id: string;
  company_name: string;
  short_code: string;
  color: string;
};

export type Deal = {
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

export type Mailbox = {
  id: string;
  email: string;
  display_name: string | null;
  provider: string;
  creator_id: string | null;
};

export type CreatorsData = {
  creators: Creator[];
  brands: Brand[];
  deals: Deal[];
  mailboxes: Mailbox[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <SiInstagram />,
  TikTok: <SiTiktok />,
  YouTube: <SiYoutube />,
  Spotify: <SiSpotify />,
  OnlyFans: <SiOnlyfans />,
  X: <SiX />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(n: number) {
  return `$${(n / 1000).toFixed(1)}k`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  c,
  size = "md",
}: {
  c: Creator;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const cls = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
    xl: "w-14 h-14 text-base",
  }[size];
  return (
    <span
      className={cn(
        "rounded-xl inline-flex items-center justify-center font-bold text-white shrink-0",
        cls,
      )}
      style={{ background: c.color }}
    >
      {c.initials}
    </span>
  );
}

function PlatformIcon({ p }: { p: string }) {
  const icon = PLATFORM_ICONS[p];
  return icon ? (
    <span
      className="text-muted-foreground hover:text-foreground transition-colors text-base"
      title={p}
    >
      {icon}
    </span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
      {p}
    </span>
  );
}

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
          style={{
            background: STAGE_COLORS[deal.status] ?? "oklch(0.6 0.02 85)",
          }}
        />
        {deal.status}
      </div>
      <span className="text-sm font-medium tabular-nums shrink-0">
        {formatMoney(Number(deal.budget))}
      </span>
    </div>
  );
}

// ─── Creator Sheet ────────────────────────────────────────────────────────────

interface CreatorSheetProps {
  creator: Creator | null;
  brands: Brand[];
  deals: Deal[];
  mailboxes: Mailbox[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => Promise<void>;
}

export function CreatorSheet({
  creator,
  brands,
  deals,
  mailboxes,
  open,
  onOpenChange,
  onDelete,
}: CreatorSheetProps) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!creator || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(creator.id);
      setConfirmDelete(false);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!creator) return null;

  const creatorDeals = deals.filter((d) => d.creator_id === creator.id);
  const creatorMailboxes = mailboxes.filter((m) => m.creator_id === creator.id);
  const totalRevenue = creatorDeals.reduce((s, d) => s + Number(d.budget), 0);
  const avgDeal = creatorDeals.length
    ? Math.round(totalRevenue / creatorDeals.length)
    : 0;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 overflow-hidden rounded-tl-4xl rounded-bl-4xl"
        style={{ width: "50vw", minWidth: "400px", maxWidth: "95vw" }}
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-5 pb-0 border-b border-border-light shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
              {creator.id.slice(0, 8).toUpperCase()}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/creators/edit-form/${creator.id}`)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Bearbeiten
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Löschen
                </Button>
              )}
            </div>
          </div>

          <>
            <div className="flex items-start gap-4 mb-4">
              <Avatar c={creator} size="xl" />
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl font-semibold tracking-tight">
                  {creator.full_name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {creator.handle ?? "—"} · {creator.niche ?? "—"}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {creator.platforms.map((p) => (
                    <PlatformIcon key={p} p={p} />
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
                {[
                  { label: "Reach", value: creator.followers ?? "—" },
                  { label: "Deals", value: creatorDeals.length },
                  {
                    label: "MTD",
                    value: formatMoney(creator.monthly_revenue),
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      {s.label}
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList
                variant="line"
                className="w-full rounded-none border-0 bg-transparent h-auto pb-0"
              >
                {[
                  { value: "overview", label: "Übersicht" },
                  { value: "campaigns", label: "Kampagnen" },
                  { value: "finance", label: "Finanzen" },
                  { value: "notes", label: "Notizen" },
                ].map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="rounded-none px-3 pb-2"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={tab} onValueChange={setTab} className="h-full">
            <TabsContent value="overview" className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    label: "Gesamtvolumen",
                    value: `$${(totalRevenue / 1000).toFixed(1)}k`,
                  },
                  {
                    label: "Aktive Deals",
                    value: creatorDeals.filter(
                      (d) => !["paid", "posted"].includes(d.status),
                    ).length,
                  },
                  {
                    label: "Ø Deal-Größe",
                    value: creatorDeals.length
                      ? `$${avgDeal.toLocaleString()}`
                      : "—",
                  },
                  {
                    label: "Monatl. Umsatz",
                    value: formatMoney(creator.monthly_revenue),
                  },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-3">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {s.label}
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {creatorMailboxes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Verbundene Postfächer
                  </h3>
                  <div className="bg-muted/30 rounded-xl px-4">
                    {creatorMailboxes.map((m) => (
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

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Aktuelle Deals ({creatorDeals.length})
                </h3>
                {creatorDeals.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Noch keine Deals.
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-xl px-4">
                    {creatorDeals.slice(0, 6).map((d) => (
                      <DealRow
                        key={d.id}
                        deal={d}
                        brand={brands.find((b) => b.id === d.brand_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="campaigns" className="p-6">
              <div className="bg-card rounded-2xl overflow-hidden border border-border-light">
                {creatorDeals.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Keine Kampagnen vorhanden.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-light">
                        {["Brand", "Kampagne", "Status", "Fällig", "Wert"].map(
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
                      {creatorDeals.map((d) => {
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
                                      STAGE_COLORS[d.status] ??
                                      "oklch(0.6 0.02 85)",
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
            </TabsContent>

            <TabsContent value="finance" className="p-6 flex flex-col gap-4">
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
                    sub: `${creatorDeals.length} Deals`,
                  },
                  {
                    label: "Ø Deal-Größe",
                    value: creatorDeals.length
                      ? `$${avgDeal.toLocaleString()}`
                      : "—",
                    sub: `${creatorDeals.length} Deals`,
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
              {creatorDeals.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Alle Deals
                  </h3>
                  <div className="bg-muted/30 rounded-xl px-4">
                    {creatorDeals.map((d) => (
                      <DealRow
                        key={d.id}
                        deal={d}
                        brand={brands.find((b) => b.id === d.brand_id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="notes"
              className="p-6 flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground"
            >
              <Inbox className="w-8 h-8 opacity-20" />
              <p className="text-sm">
                Noch keine Notizen für {creator.full_name}.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>

    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Creator löschen?</DialogTitle>
          <DialogDescription>
            <strong>{creator.full_name}</strong> wird dauerhaft gelöscht. Diese
            Aktion kann nicht rückgängig gemacht werden.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(false)}
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Wird gelöscht…" : "Löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
