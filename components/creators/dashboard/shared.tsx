"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_STYLE } from "./constants";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Kopieren"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export function BrandAvatar({
  brand,
  size = "md",
}: {
  brand: { color: string; short_code: string; company_name: string };
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "rounded-md shrink-0 inline-flex items-center justify-center font-bold text-white",
        size === "sm" ? "w-5 h-5 text-[8px]" : "w-6 h-6 text-[9px]",
      )}
      style={{ background: brand.color }}
      title={brand.company_name}
    >
      {brand.short_code.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.incoming;
  return (
    <span
      className={cn(
        "shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none",
        s.bg,
        s.text,
      )}
    >
      {s.label}
    </span>
  );
}
