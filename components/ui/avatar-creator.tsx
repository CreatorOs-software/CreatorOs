import { AvatarDisplay, type AvatarSize } from "./avatar-display";
import type { AvatarConfig } from "@/lib/avatar";

interface AvatarProps {
  initials: string;
  avatarConfig?: AvatarConfig | null;
  seed?: string;
  name?: string | null;
  size?: AvatarSize;
  /** `default` = neutral grey · `team` = light tint of the brand colour (team members only) */
  variant?: "default" | "team";
  className?: string;
}

export function Avatar({
  initials,
  avatarConfig,
  seed,
  name,
  size = "md",
  className,
}: AvatarProps) {
  return <AvatarDisplay config={avatarConfig} seed={seed ?? name ?? initials} name={name} size={size} className={className} />;
}

// Back-compat alias — historically this component was creator-only.
export const AvatarCreator = Avatar;
