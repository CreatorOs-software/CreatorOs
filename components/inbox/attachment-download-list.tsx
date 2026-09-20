"use client";

import { FileText, Paperclip } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatBytes } from "@/components/ui/file-upload";

type Attachment = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
};

// Plain attachment viewer for the reading pane — independent of the
// AI-relevance-gated list the WorkPanel's AttachmentAnalyzer uses. A human
// can always open a file they can already see is attached to the email.
export function AttachmentDownloadList({ threadId }: { threadId: string }) {
  const { data } = useQuery({
    queryKey: ["inbox-attachments-all", threadId],
    queryFn: async () => {
      const res = await fetch(`/api/inbox/${threadId}/attachments/all`);
      if (!res.ok) return { attachments: [] as Attachment[] };
      return res.json() as Promise<{ attachments: Attachment[] }>;
    },
  });
  const attachments = data?.attachments ?? [];

  if (attachments.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-1.5 border-t border-[#E7E7E7] pt-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Paperclip className="h-3 w-3" />
        Anhänge ({attachments.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((a) => (
          <a
            key={a.id}
            href={`/api/inbox/${threadId}/attachments/${a.id}/open`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs hover:bg-muted"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-[220px] truncate font-medium">{a.filename}</span>
            <span className="shrink-0 text-muted-foreground">{formatBytes(a.size_bytes)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
