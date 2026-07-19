import { cn } from "@/lib/utils";

interface AvatarCreatorProps {
  initials: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASS = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-11 h-11 text-sm",
  xl: "w-14 h-14 text-base",
} as const;

export function AvatarCreator({
  initials,
  color,
  size = "md",
  className,
}: AvatarCreatorProps) {
  return (
    <span
      className={cn(
        "rounded-xl inline-flex items-center justify-center font-bold text-white shrink-0",
        SIZE_CLASS[size],
        className,
      )}
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}
