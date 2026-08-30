"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Braces } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Template, TemplateChannel } from "@/domains/templates";
import { VARIABLE_REGISTRY, type VariableGroup } from "@/lib/templates/variable-registry";
import { useVariableSlashMenu } from "./variable-slash-menu";

export type TemplateFormValue = {
  name: string;
  channel: TemplateChannel;
  subject: string;
  body: string;
};

const CHANNEL_LABELS: Record<TemplateChannel, string> = {
  email: "E-Mail",
  whatsapp: "WhatsApp",
  general: "Allgemein",
};

const GROUP_LABELS: Record<VariableGroup, string> = {
  creator: "Creator",
  brand: "Brand",
  account: "Account",
};

export function templateToFormValue(
  t?: Template | null,
  overrides?: Partial<TemplateFormValue>,
): TemplateFormValue {
  return {
    name: t?.name ?? "",
    channel: t?.channel ?? "email",
    subject: t?.subject ?? "",
    body: t?.body ?? "",
    ...overrides,
  };
}

function VariablePicker({ onPick }: { onPick: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const groups: VariableGroup[] = ["creator", "brand", "account"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        type="button"
      >
        <Braces className="h-3.5 w-3.5" />
        Variable einfügen
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="max-h-80 overflow-y-auto py-1">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS[group]}
              </p>
              {VARIABLE_REGISTRY.filter((v) => v.group === group).map((v) => (
                <button
                  key={v.path}
                  type="button"
                  onClick={() => {
                    onPick(v.path);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted"
                >
                  <span className="text-xs font-medium">{v.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {"${" + v.path + "}"}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TemplateForm({
  value,
  onChange,
  showSubject,
}: {
  value: TemplateFormValue;
  onChange: (patch: Partial<TemplateFormValue>) => void;
  showSubject: boolean;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const slashMenu = useVariableSlashMenu({
    mode: "literal",
    textareaRef: bodyRef,
    onReplace: (next) => onChange({ body: next }),
  });

  function insertAtCursor(path: string) {
    const el = bodyRef.current;
    const snippet = "${" + path + "}";
    if (!el) {
      onChange({ body: value.body + snippet });
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = value.body.slice(0, start) + snippet + value.body.slice(end);
    onChange({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Name *
          </label>
          <Input
            autoFocus
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="z. B. Interesse + Mediakit"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Kanal
          </label>
          <Select
            value={value.channel}
            onValueChange={(v) => onChange({ channel: v as TemplateChannel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHANNEL_LABELS) as TemplateChannel[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showSubject && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Betreff
          </label>
          <Input
            value={value.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="Optional, unterstützt ebenfalls ${...} Variablen"
          />
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-muted-foreground">
            Text *
          </label>
          <VariablePicker onPick={insertAtCursor} />
        </div>
        <Textarea
          ref={bodyRef}
          value={value.body}
          onChange={(e) => {
            onChange({ body: e.target.value });
            slashMenu.handleChange(e);
          }}
          onKeyDown={(e) => {
            slashMenu.handleKeyDown(e);
          }}
          placeholder={"Hallo ${creator.firstName}, … oder tippe / für Variablen"}
          className={cn("min-h-40 font-mono text-[13px]")}
        />
        {slashMenu.menu}
      </div>
    </div>
  );
}
