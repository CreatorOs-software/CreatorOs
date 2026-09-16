import { Paperclip } from "lucide-react";

export function AttachmentBadge({ filename }: { filename: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
      <Paperclip className="h-2.5 w-2.5" />
      {filename}
    </span>
  );
}
