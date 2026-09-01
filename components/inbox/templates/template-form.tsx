"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Template, TemplateChannel } from "@/domains/templates";
import { useVariableSlashMenu } from "./variable-slash-menu";
import { VariablePicker } from "./variable-picker";

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
          <VariablePicker onPick={slashMenu.insertVariable} />
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
