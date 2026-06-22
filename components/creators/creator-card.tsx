"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SiInstagram,
  SiOnlyfans,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import type { Creator } from "./creator-sheet";

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

export function formatMoney(n: number) {
  return `$${(n / 1000).toFixed(1)}k`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({
  c,
  size = "md",
}: {
  c: Creator;
  size?: "sm" | "md" | "lg";
}) {
  const cls = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-11 h-11 text-sm",
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

// ─── Platform icon ────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <SiInstagram />,
  TikTok: <SiTiktok />,
  YouTube: <SiYoutube />,
  Spotify: <SiSpotify />,
  OnlyFans: <SiOnlyfans />,
  X: <SiX />,
};

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

// ─── Creator Card ─────────────────────────────────────────────────────────────

export function CreatorCard({
  c,
  activeDeals,
  onOpenSheet,
}: {
  c: Creator;
  activeDeals: number;
  onOpenSheet: () => void;
}) {
  const router = useRouter();

  return (
    <Card
      onClick={() => router.push(`/creators/dashboard/${c.id}`)}
      className="relative w-full text-left cursor-pointer bg-card rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      {/* Eye icon — opens detail sheet without navigating */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          onOpenSheet();
        }}
        className="absolute top-3 right-3 z-10"
        aria-label="Details anzeigen"
      >
        <Eye />
      </Button>

      <div className="flex items-start gap-3">
        <Avatar c={c} size="md" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{c.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {c.handle ?? "—"}
          </div>
        </div>
        {c.status !== "active" && (
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 mr-6",
              STATUS_CLASS[c.status],
            )}
          >
            {STATUS_LABEL[c.status]}
          </span>
        )}
      </div>

      {(c.niche.length > 0 || c.platforms.length > 0) && (
        <div className="flex gap-1 flex-wrap">
          {c.niche.map((n) => (
            <span key={n} className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground">
              {n}
            </span>
          ))}
          {c.platforms.map((p) => (
            <PlatformIcon key={p} p={p} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border-light">
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Reach</div>
          <div className="text-sm font-semibold tabular-nums">
            {c.followers ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Deals</div>
          <div className="text-sm font-semibold tabular-nums">
            {activeDeals}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">MTD</div>
          <div className="text-sm font-semibold tabular-nums">
            {formatMoney(c.monthly_revenue)}
          </div>
        </div>
      </div>
    </Card>
  );
}
