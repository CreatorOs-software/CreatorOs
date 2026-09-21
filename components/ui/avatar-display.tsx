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

interface AvatarDisplayProps {
  config?: AvatarConfig | null;
  seed: string;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function AvatarDisplay({
  config,
  seed,
  name,
  size = "md",
  className,
}: AvatarDisplayProps) {
  const safeConfig = parseAvatarConfig(config) ?? makeAvatarConfig(seed);

  return (
    <span
      role="img"
      aria-label={name ? `Avatar von ${name}` : "Avatar"}
      className={cn("inline-flex shrink-0 overflow-hidden rounded-full", SIZE_CLASS[size], className)}
    >
      <NiceAvatar className="size-full" shape="circle" {...safeConfig} />
    </span>
  );
}
