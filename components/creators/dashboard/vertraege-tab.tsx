"use client";

import { DocumentUpload } from "@/components/ui/file-upload";
import type { Invoice } from "./types";

export function VertraegeTab({
  invoices,
  creatorId,
}: {
  invoices: Invoice[];
  creatorId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Rechnungen */}

      {/* Dokumente */}
      <div className="bg-card rounded-2xl p-5 pb-6">
        <DocumentUpload creatorId={creatorId} />
      </div>
    </div>
  );
}
