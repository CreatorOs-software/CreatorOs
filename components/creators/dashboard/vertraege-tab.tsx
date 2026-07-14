"use client";

import { cn } from "@/lib/utils";
import type { Invoice } from "./types";
import { INVOICE_STATUS, fmtDate, fmtMoney } from "./constants";
import { BrandAvatar } from "./shared";
import { DocumentUpload } from "@/components/ui/file-upload";

export function VertraegeTab({ invoices }: { invoices: Invoice[] }) {
  const now = Date.now();

  return (
    <div className="flex flex-col gap-4">
      {/* Rechnungen */}

      {/* Dokumente */}
      <div className="bg-card rounded-2xl p-5 pb-6">
        <DocumentUpload />
      </div>
    </div>
  );
}
