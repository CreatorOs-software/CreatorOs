"use client";

import { useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  DatePicker,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@talentos/ui";
import { Upload, FileIcon, X } from "lucide-react";
import type {
  DealForm,
  DealField,
  StepErrors,
  BrandOption,
} from "../deal-form.types";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";

interface Step1Props {
  form: DealForm;
  errors: StepErrors;
  brands: BrandOption[];
  users: { id: string; display_name: string }[];
  documents: File[];
  onDocumentsChange: (files: File[]) => void;
  onNext: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Step1({
  form,
  errors,
  brands,
  users,
  documents,
  onDocumentsChange,
  onNext,
}: Step1Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const added = Array.from(newFiles);
    onDocumentsChange([...documents, ...added]);
  }

  function removeDocument(index: number) {
    onDocumentsChange(documents.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <Accordion
        type="multiple"
        defaultValue={["kampagne", "rahmendaten", "bearbeiter", "dokumente"]}
        className="flex flex-col gap-4"
      >
        {/* ── Kampagne ───────────────────────────────────────────── */}
        <AccordionItem value="kampagne">
          <AccordionTrigger>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Kampagne</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Titel, Brand und Produkt der Kampagne.
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4">
              {/* Kampagnen-Titel */}
              <form.Field name="title">
                {(field: DealField<"title">) => (
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium">
                      Kampagnen-Titel{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="z.B. Sommerkollektion 2025"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                    {errors.title && (
                      <p
                        data-field-error
                        className="mt-1.5 text-xs text-destructive"
                      >
                        {errors.title}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Brand + Produkt */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field name="brand_id">
                  {(field: DealField<"brand_id">) => (
                    <div>
                      <Label className="text-sm font-medium">Brand</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => {
                          if (val) field.handleChange(val);
                        }}
                      >
                        <SelectTrigger className="mt-2 w-full">
                          <SelectValue placeholder="Brand auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="product">
                  {(field: DealField<"product">) => (
                    <div>
                      <Label htmlFor="product" className="text-sm font-medium">
                        Produkt
                      </Label>
                      <Input
                        id="product"
                        placeholder="z.B. Handcreme SPF50"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="mt-2"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Rahmendaten ───────────────────────────────────────── */}
        <AccordionItem value="rahmendaten">
          <AccordionTrigger>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Rahmendaten
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ansprechpartner und Kampagnenzeitraum.
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4">
              {/* Ansprechpartner */}
              <form.Field name="contact_person">
                {(field: DealField<"contact_person">) => (
                  <div>
                    <Label
                      htmlFor="contact_person"
                      className="text-sm font-medium"
                    >
                      Ansprechpartner
                    </Label>
                    <Input
                      id="contact_person"
                      placeholder="z.B. Anna Müller"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </div>
                )}
              </form.Field>

              {/* Kampagnenzeitraum */}
              <form.Field name="campaign_start">
                {(startField: DealField<"campaign_start">) => (
                  <form.Field name="campaign_end">
                    {(endField: DealField<"campaign_end">) => (
                      <div classN>
                        <Label className="text-sm font-medium">
                          Kampagnenzeitraum
                        </Label>
                        <DatePicker
                          range
                          startValue={startField.state.value || null}
                          endValue={endField.state.value || null}
                          onChangeStart={(v) =>
                            startField.handleChange((v ?? "") as never)
                          }
                          onChangeEnd={(v) =>
                            endField.handleChange((v ?? "") as never)
                          }
                          className="mt-2"
                        />
                      </div>
                    )}
                  </form.Field>
                )}
              </form.Field>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Bearbeiter ────────────────────────────────────────── */}
        <AccordionItem value="bearbeiter">
          <AccordionTrigger>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Bearbeiter
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Zuständige Person aus der Agentur.
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <form.Field name="assignee_id">
              {(field: DealField<"assignee_id">) => (
                <div>
                  <Label className="text-sm font-medium">Bearbeiter</Label>
                  <Select
                    value={(field.state.value as string | undefined) ?? ""}
                    onValueChange={(val) => {
                      field.handleChange(val as never);
                    }}
                  >
                    <SelectTrigger className="mt-2 w-full">
                      <SelectValue placeholder="Bearbeiter auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </AccordionContent>
        </AccordionItem>

        {/* ── Dokumente ─────────────────────────────────────────── */}
        <AccordionItem value="dokumente">
          <AccordionTrigger>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Dokumente</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vertragsunterlagen und Briefing-Dateien.
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              {/* Drop zone */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`
                  h-auto w-full flex flex-col items-center justify-center gap-2
                  rounded-xl border-2 border-dashed px-4 py-8
                  text-sm text-muted-foreground
                  cursor-pointer
                  ${
                    dragging
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                  }
                `}
              >
                <Upload className="w-5 h-5" />
                <span>
                  Dateien hierher ziehen oder{" "}
                  <span className="text-primary underline underline-offset-2">
                    auswählen
                  </span>
                </span>
                <span className="text-xs text-muted-foreground/60">
                  PDF, Word, Excel, PNG, JPG
                </span>
              </Button>

              {/* File list */}
              {documents.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {documents.map((file, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border-light bg-muted/20 px-3 py-2"
                    >
                      <FileIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDocument(i)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <StepNav onNext={onNext} submitLabel="Deal anlegen" />
    </div>
  );
}
