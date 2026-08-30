import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type AvatarVariant = "default" | "team";

interface AvatarProps {
  initials: string;
  size?: AvatarSize;
  /** `default` = neutral grey · `team` = light tint of the brand colour (team members only) */
  variant?: AvatarVariant;
  className?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-11 h-11 text-sm",
  xl: "w-14 h-14 text-base",
  "2xl": "w-20 h-20 text-2xl",
};

const VARIANT_CLASS: Record<AvatarVariant, string> = {
  default: "bg-zinc-100 text-zinc-500",
  team: "bg-brand/10 text-brand",
};

export function Avatar({
  initials,
  size = "md",
  variant = "default",
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold shrink-0 uppercase",
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {initials}
    </span>
  );
}

// Back-compat alias — historically this component was creator-only.
export const AvatarCreator = Avatar;
