"use client";

import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SiInstagram,
  SiOnlyfans,
  SiSpotify,
  SiTiktok,
  SiX,
  SiYoutube,
} from "react-icons/si";
import type { Creator } from "./creator-sheet";
import { Button } from "../ui/button";

const STATUS_DOT: Record<string, "online" | "away" | "offline"> = {
  active: "online",
  "on-break": "away",
  inactive: "offline",
};

export function formatMoney(n: number) {
  return `$${(n / 1000).toFixed(1)}k`;
}

// ─── Avatar (small inline version used in other components) ───────────────────

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

// ─── Platform icons ────────────────────────────────────────────────────────────

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
    <span className="text-muted-foreground text-sm" title={p}>
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
  const dot = STATUS_DOT[c.status];

  return (
    <div
      onClick={() => router.push(`/creators/dashboard/${c.id}`)}
      className="group relative overflow-hidden rounded-3xl bg-card p-6 cursor-pointer flex flex-col
        shadow-lg
        transition-all duration-500
        hover:shadow-[16px_16px_32px_rgba(0,0,0,0.14),-16px_-16px_32px_rgba(255,255,255,1)]
        hover:scale-[1.025] hover:-translate-y-1.5"
    >
      {/* Status dot */}
      <div className="absolute right-4 top-4 z-10">
        <div className="relative">
          <div
            className={cn(
              "h-3 w-3 rounded-full border-2 border-[#f0eeea] transition-all duration-300 group-hover:scale-125",
              dot === "online"
                ? "bg-green-500 group-hover:shadow-[0_0_14px_rgba(34,197,94,0.7)]"
                : dot === "away"
                  ? "bg-amber-500"
                  : "bg-gray-400",
            )}
          />
          {dot === "online" && (
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-30" />
          )}
        </div>
      </div>

      {/* Initials avatar */}
      <div className="mb-5 flex justify-center relative z-10">
        <div className="relative">
          <div
            className="h-24 w-24 rounded-full p-[3px]
              shadow-[inset_5px_5px_10px_rgba(0,0,0,0.10),inset_-5px_-5px_10px_rgba(255,255,255,0.95)]
              transition-all duration-500 group-hover:scale-110"
          >
            <div
              className="h-full w-full rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: c.color }}
            >
              {c.initials}
            </div>
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full border-2 border-accent opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse" />
        </div>
      </div>

      {/* Name + handle */}
      <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
        <h3 className="text-base font-semibold text-gray-800 transition-colors duration-300 group-hover:text-accent">
          {c.full_name}
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 transition-colors duration-300 group-hover:text-gray-700">
          {c.handle ?? "—"}
        </p>
        {c.followers && (
          <p className="mt-1.5 text-[11px] text-gray-400 transition-all duration-300 group-hover:text-accent group-hover:font-medium">
            {c.followers} followers
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-[#e0ded9] relative z-10">
        <div className="text-center">
          <div className="text-[10px] text-gray-400 mb-0.5">Deals</div>
          <div className="text-sm font-semibold text-gray-700 tabular-nums">
            {activeDeals}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-gray-400 mb-0.5">MTD</div>
          <div className="text-sm font-semibold text-gray-700 tabular-nums">
            {formatMoney(c.monthly_revenue)}
          </div>
        </div>
      </div>

      {/* Push buttons to bottom */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="mt-4 flex gap-2 relative z-10">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/creators/edit-form/${c.id}`);
          }}
          className="flex-1"
          aria-label="Creator bearbeiten"
          variant={"outline"}
        >
          <Pencil className="mx-auto h-4 w-4" />
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSheet();
          }}
          className="flex-1"
          variant={"outline"}
        >
          <Eye className="mx-auto h-4 w-4 " />
        </Button>
      </div>

      {/* Hover border */}
      <div className="absolute inset-0 rounded-3xl border border-accent/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
}
