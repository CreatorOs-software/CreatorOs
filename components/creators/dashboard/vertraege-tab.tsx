"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { DocumentUpload, type DocEntry } from "@/components/ui/file-upload";
import type { Invoice } from "./types";

export function VertraegeTab({
  invoices,
  documents,
  creatorId,
}: {
  invoices: Invoice[];
  documents: DocEntry[];
  creatorId: string;
}) {
  const queryClient = useQueryClient();

  const handleUpload = useCallback(async (file: File): Promise<DocEntry> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/creators/${creatorId}/documents`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");
    queryClient.invalidateQueries({ queryKey: QueryKeys.creators.documents(creatorId) });
    return data.document as DocEntry;
  }, [creatorId, queryClient]);

  const handleDelete = useCallback(async (doc: DocEntry): Promise<void> => {
    const res = await fetch(`/api/creators/${creatorId}/documents`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: doc.path }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Fehler beim Löschen");
    }
    queryClient.invalidateQueries({ queryKey: QueryKeys.creators.documents(creatorId) });
  }, [creatorId, queryClient]);

  return (
    <div className="flex flex-col gap-4">
      {/* Rechnungen */}

      {/* Dokumente */}
      <div className="bg-card rounded-2xl p-5 pb-6">
        <DocumentUpload
          documents={documents}
          onUpload={handleUpload}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
