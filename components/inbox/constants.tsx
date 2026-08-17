import { Bell, Eye, Mail, Tag as TagIcon, User, Zap } from "lucide-react";
import demoData from "./demo.json";
import type { Category, Tag } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "important",
    label: "Important",
    icon: <Zap className="h-3.5 w-3.5 fill-current" />,
    color: "bg-[#F59E0D]",
    tagId: "important",
  },
  {
    id: "all",
    label: "All Mail",
    icon: <Mail className="h-3.5 w-3.5 fill-current" />,
    color: "bg-[#006FFE]",
  },
  {
    id: "personal",
    label: "Personal",
    icon: <User className="h-3.5 w-3.5 fill-current" />,
    color: "bg-[#39AE4A]",
    tagId: "personal",
  },
  {
    id: "updates",
    label: "Updates",
    icon: <Bell className="h-3.5 w-3.5 fill-current" />,
    color: "bg-[#8B5CF6]",
    tagId: "updates",
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: <TagIcon className="h-3.5 w-3.5 fill-current" />,
    color: "bg-[#F43F5E]",
    tagId: "promotions",
  },
  {
    id: "unread",
    label: "Unread",
    icon: <Eye className="h-3.5 w-3.5 fill-current" />,
    color: "bg-[#FF4800]",
  },
];

export const TAG_COLORS: Record<string, string> = {
  important: "bg-[#F59E0D]/15 text-[#b45309] border border-[#F59E0D]/30",
  updates: "bg-[#8B5CF6]/15 text-[#6d28d9] border border-[#8B5CF6]/30",
  personal: "bg-[#39AE4A]/15 text-[#15803d] border border-[#39AE4A]/30",
  promotions: "bg-[#F43F5E]/15 text-[#be123c] border border-[#F43F5E]/30",
};

export const DEMO_LABELS: Tag[] = Array.from(
  new Map(demoData.flatMap((m) => m.tags).map((t) => [t.id, t])).values(),
);

export const GOOGLE_PATHS = [
  {
    d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
    fill: "#4285F4",
  },
  {
    d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
    fill: "#34A853",
  },
  {
    d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
    fill: "#FBBC05",
  },
  {
    d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
    fill: "#EA4335",
  },
] as const;
