import { cn } from "@/lib/utils";

interface AvatarCreatorProps {
  initials: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const SIZE_CLASS = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-11 h-11 text-sm",
  xl: "w-14 h-14 text-base",
  "2xl": "w-20 h-20 text-2xl",
} as const;

export function AvatarCreator({
  initials,
  size = "md",
  className,
}: AvatarCreatorProps) {
  return (
    <span
      className={cn(
        "rounded-xl inline-flex items-center justify-center font-bold text-brand shrink-0 bg-orange-100",
        SIZE_CLASS[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
