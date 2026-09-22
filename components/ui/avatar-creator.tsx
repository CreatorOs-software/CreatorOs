"use client";

import NiceAvatar, { genConfig } from "react-nice-avatar";
import type { AvatarConfig } from "@/lib/avatar";
import { parseAvatarConfig } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-11",
  xl: "size-14",
  "2xl": "size-20",
};

export function makeAvatarConfig(seed: string): AvatarConfig {
  return parseAvatarConfig(genConfig(seed)) ?? parseAvatarConfig(genConfig("talentos"))!;
}

interface AvatarProps {
  initials: string;
  avatarConfig?: AvatarConfig | null;
  name?: string | null;
  size?: AvatarSize;
  /** `default` = neutral grey · `team` = light tint of the brand colour (team members only) */
  variant?: "default" | "team";
  className?: string;
}

export function Avatar({
  initials,
  avatarConfig,
  name,
  size = "md",
  variant = "default",
  className,
}: AvatarProps) {
  const safeConfig = parseAvatarConfig(avatarConfig);

  return (
    <span
      role="img"
      aria-label={name ? `Avatar von ${name}` : "Avatar"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        SIZE_CLASS[size],
        className,
      )}
    >
      {safeConfig ? (
        <NiceAvatar className="block size-full shrink-0" shape="circle" {...safeConfig} />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center rounded-full font-bold uppercase leading-none",
            variant === "team" ? "bg-brand/10 text-brand" : "bg-zinc-100 text-zinc-500",
          )}
        >
          {initials || "?"}
        </span>
      )}
    </span>
  );
}
