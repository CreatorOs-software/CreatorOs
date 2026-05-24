import { cn } from "@/lib/utils";
import { Users, UserPlus, Briefcase, type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  value,
  label,
  className,
}: StatCardProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className="w-5 h-5 text-muted-foreground" />
      <span className="text-4xl font-light tracking-tight">{value}</span>
      <span className="text-sm text-muted-foreground self-end pb-1">
        {label}
      </span>
    </div>
  );
}

interface StatGroupProps {
  className?: string;
}

export function StatGroup({ className }: StatGroupProps) {
  const stats = [
    { icon: Users, value: 78, label: "Employe" },
    { icon: UserPlus, value: 56, label: "Hirings" },
    { icon: Briefcase, value: 203, label: "Projects" },
  ];

  return (
    <div className={cn("flex items-end self-end gap-6", className)}>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
