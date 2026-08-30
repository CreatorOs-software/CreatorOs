import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { Template, TemplateChannel } from "@/domains/templates";

const CHANNEL_META: Record<TemplateChannel, { label: string; bg: string; text: string }> = {
  email: { label: "E-Mail", bg: "bg-blue-500/15", text: "text-blue-600" },
  whatsapp: { label: "WhatsApp", bg: "bg-green-500/15", text: "text-green-700" },
  general: { label: "Allgemein", bg: "bg-zinc-100", text: "text-zinc-600" },
};

export const templatesColumns: ColumnDef<Template>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    cell: ({ row }) => (
      <p className="text-xs font-medium truncate">{row.original.name}</p>
    ),
    size: 200,
  },
  {
    id: "channel",
    header: "Kanal",
    cell: ({ row }) => {
      const meta = CHANNEL_META[row.original.channel];
      return (
        <span className={cn("text-[9px] font-medium px-2 py-0.5 rounded-full", meta.bg, meta.text)}>
          {meta.label}
        </span>
      );
    },
    size: 100,
  },
  {
    id: "preview",
    header: "Vorschau",
    cell: ({ row }) => (
      <p className="text-xs text-muted-foreground truncate">
        {row.original.subject || row.original.body}
      </p>
    ),
    size: 320,
  },
];
