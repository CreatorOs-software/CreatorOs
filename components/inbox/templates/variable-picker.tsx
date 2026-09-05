"use client";

import { useMemo, useState } from "react";
import { Braces } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  VARIABLE_REGISTRY,
  type VariableGroup,
} from "@/lib/templates/variable-registry";

const GROUP_LABELS: Record<VariableGroup, string> = {
  creator: "Creator",
  brand: "Brand",
  account: "Account",
};
const GROUP_ORDER: VariableGroup[] = ["creator", "brand", "account"];

type Props = {
  /** Called with the variable path (e.g. "creator.firstName") when one is picked. */
  onPick: (path: string) => void;
  align?: "start" | "center" | "end";
  className?: string;
};

/**
 * Shared "Variable einfügen" button. Opens a searchable lookup of the
 * variable registry, grouped by scope. The caller decides what to do with
 * the picked path (insert `${path}` literally, or resolve it) — usually via
 * `useVariableSlashMenu(...).insertVariable`.
 */
export function VariablePicker({ onPick, align = "start", className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? VARIABLE_REGISTRY.filter(
          (v) =>
            v.path.toLowerCase().includes(q) ||
            v.label.toLowerCase().includes(q),
        )
      : VARIABLE_REGISTRY;
    return GROUP_ORDER.map((group) => ({
      group,
      entries: filtered.filter((v) => v.group === group),
    })).filter((g) => g.entries.length > 0);
  }, [query]);

  function pick(path: string) {
    onPick(path);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      <PopoverTrigger
        type="button"
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
      >
        <Braces className="h-3.5 w-3.5" />
        Variable einfügen
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align={align}>
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Variable suchen…"
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              Keine Treffer.
            </p>
          ) : (
            results.map(({ group, entries }) => (
              <div key={group}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROUP_LABELS[group]}
                </p>
                {entries.map((v) => (
                  <button
                    key={v.path}
                    type="button"
                    onClick={() => pick(v.path)}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted"
                  >
                    <span className="text-xs font-medium">{v.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {"${" + v.path + "}"}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
