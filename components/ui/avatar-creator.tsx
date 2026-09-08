import { Avatar as UIAvatar, AvatarFallback } from "@talentos/ui";
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
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-11 text-sm",
  xl: "size-14 text-base",
  "2xl": "size-20 text-2xl",
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
    <UIAvatar className={cn(SIZE_CLASS[size], className)}>
      <AvatarFallback
        className={cn("font-bold uppercase text-inherit", VARIANT_CLASS[variant])}
      >
        {initials}
      </AvatarFallback>
    </UIAvatar>
  );
}

// Back-compat alias — historically this component was creator-only.
export const AvatarCreator = Avatar;
