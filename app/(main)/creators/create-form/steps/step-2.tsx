"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { NICHE_OPTIONS } from "../creator-form.constants";
import type {
  CreatorForm,
  CreatorField,
  StepErrors,
} from "../creator-form.types";
import type { CreatorFormValues } from "../creator-form.schema";
import { StepNav } from "./step-nav";

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}

function XIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth={2.5}
      {...props}
    >
      <path d="m4.5 4.5 7 7m-7 0 7-7" />
    </svg>
  );
}

interface Step2Props {
  form: CreatorForm;
  errors: StepErrors;
  onNext: () => void;
  onPrev: () => void;
}

export function Step2({ form, onNext, onPrev }: Step2Props) {
  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Profil & Kategorie</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Nische, Beschreibung und aktueller Status des Creators.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
            {/* Bio */}
            <div className="col-span-full">
              <form.Field name="bio">
                {(field: CreatorField<"bio">) => (
                  <>
                    <Label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      placeholder="Kurze Beschreibung des Creators…"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2 resize-none h-20"
                    />
                  </>
                )}
              </form.Field>
            </div>

            {/* Niche — Base UI multi combobox */}
            <div className="col-span-full">
              <form.Field name="niche">
                {(field: CreatorField<"niche">) => (
                  <>
                    <Label className="text-sm font-medium">
                      Nische / Kategorie
                    </Label>
                    <div className="mt-2">
                      <Combobox.Root
                        items={NICHE_OPTIONS}
                        multiple
                        value={field.state.value as string[]}
                        onValueChange={(val: string[]) =>
                          field.handleChange(val)
                        }
                      >
                        <Combobox.InputGroup
                          className={cn(
                            "flex flex-wrap gap-1.5 items-center min-h-9 px-3 py-1.5",
                            "rounded-lg border border-border bg-input text-sm",
                            "focus-within:ring-2 focus-within:ring-ring focus-within:outline-none",
                          )}
                        >
                          <Combobox.Chips className="contents">
                            <Combobox.Value>
                              {(value: string[]) => (
                                <React.Fragment>
                                  {value.map((item) => (
                                    <Combobox.Chip
                                      key={item}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-700 text-xs font-medium"
                                      aria-label={item}
                                    >
                                      {item}
                                      <Combobox.ChipRemove
                                        className="opacity-60 hover:opacity-100 transition-opacity"
                                        aria-label={`${item} entfernen`}
                                      >
                                        <XIcon />
                                      </Combobox.ChipRemove>
                                    </Combobox.Chip>
                                  ))}
                                  <Combobox.Input
                                    placeholder={
                                      value.length > 0
                                        ? ""
                                        : "z. B. Lifestyle, Beauty…"
                                    }
                                    className="flex-1 min-w-30 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
                                  />
                                </React.Fragment>
                              )}
                            </Combobox.Value>
                          </Combobox.Chips>
                        </Combobox.InputGroup>

                        <Combobox.Portal>
                          <Combobox.Positioner sideOffset={4}>
                            <Combobox.Popup
                              className={cn(
                                "z-50 w-(--anchor-width) rounded-xl border border-border",
                                "bg-popover text-popover-foreground shadow-md overflow-hidden py-1",
                                "animate-in fade-in-0 zoom-in-95 duration-100",
                              )}
                            >
                              <Combobox.Empty>
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  Keine Ergebnisse
                                </div>
                              </Combobox.Empty>
                              <Combobox.List>
                                {(item: string) => (
                                  <Combobox.Item
                                    key={item}
                                    value={item}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer select-none",
                                      "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                                      "data-selected:font-medium",
                                    )}
                                  >
                                    <Combobox.ItemIndicator className="flex items-center justify-center w-4 h-4 text-yellow-600">
                                      <CheckIcon />
                                    </Combobox.ItemIndicator>
                                    {item}
                                  </Combobox.Item>
                                )}
                              </Combobox.List>
                            </Combobox.Popup>
                          </Combobox.Positioner>
                        </Combobox.Portal>
                      </Combobox.Root>
                    </div>
                  </>
                )}
              </form.Field>
            </div>

            {/* Status */}
            <div className="col-span-full sm:col-span-3">
              <form.Field name="status">
                {(field: CreatorField<"status">) => (
                  <>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => {
                        if (val)
                          field.handleChange(
                            val as CreatorFormValues["status"],
                          );
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiv</SelectItem>
                        <SelectItem value="on-break">Pause</SelectItem>
                        <SelectItem value="inactive">Inaktiv</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <StepNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}
