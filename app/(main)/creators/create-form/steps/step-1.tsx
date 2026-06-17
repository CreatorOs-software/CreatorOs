"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X } from "lucide-react";
import type {
  CreatorForm,
  CreatorField,
  StepErrors,
} from "../creator-form.types";
import { StepNav } from "./step-nav";

interface Step1Props {
  form: CreatorForm;
  errors: StepErrors;
  contractFile: File | null;
  onContractFileChange: (file: File | null) => void;
  onNext: () => void;
}

export function Step1({
  form,
  errors,
  contractFile,
  onContractFileChange,
  onNext,
}: Step1Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onContractFileChange(file);
  }

  return (
    <div className="flex flex-col gap-0">
      {/* ── Sektion 1: Grundinformationen ──────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Grundinformationen</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Name und Kontaktdaten des neuen Creators.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <form.Field name="vorname">
                {(field: CreatorField<"vorname">) => (
                  <>
                    <Label htmlFor="vorname" className="text-sm font-medium">
                      Vorname <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="vorname"
                      placeholder="z.B. Lena"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                    {errors.vorname && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.vorname}
                      </p>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            <div className="sm:col-span-3">
              <form.Field name="nachname">
                {(field: CreatorField<"nachname">) => (
                  <>
                    <Label htmlFor="nachname" className="text-sm font-medium">
                      Nachname
                    </Label>
                    <Input
                      id="nachname"
                      placeholder="z.B. Müller"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            <div className="col-span-full sm:col-span-3">
              <form.Field name="handle">
                {(field: CreatorField<"handle">) => (
                  <>
                    <Label htmlFor="handle" className="text-sm font-medium">
                      Handle
                    </Label>
                    <Input
                      id="handle"
                      placeholder="@lenamueller"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            <div className="col-span-full">
              <form.Field name="email">
                {(field: CreatorField<"email">) => (
                  <>
                    <Label htmlFor="email" className="text-sm font-medium">
                      E-Mail-Adresse
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="lena@example.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-destructive">
                        {errors.email}
                      </p>
                    )}
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 2: Adresse ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Adresse</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Wohnadresse des Creators für Vertragsunterlagen.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="col-span-full">
              <form.Field name="street">
                {(field: CreatorField<"street">) => (
                  <>
                    <Label htmlFor="street" className="text-sm font-medium">
                      Straße und Hausnummer
                    </Label>
                    <Input
                      id="street"
                      placeholder="Musterstraße 12"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            <div className="sm:col-span-2">
              <form.Field name="postal_code">
                {(field: CreatorField<"postal_code">) => (
                  <>
                    <Label
                      htmlFor="postal_code"
                      className="text-sm font-medium"
                    >
                      PLZ
                    </Label>
                    <Input
                      id="postal_code"
                      placeholder="10115"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            <div className="sm:col-span-4">
              <form.Field name="city">
                {(field: CreatorField<"city">) => (
                  <>
                    <Label htmlFor="city" className="text-sm font-medium">
                      Stadt
                    </Label>
                    <Input
                      id="city"
                      placeholder="Berlin"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>

            <div className="col-span-full sm:col-span-3">
              <form.Field name="country">
                {(field: CreatorField<"country">) => (
                  <>
                    <Label htmlFor="country" className="text-sm font-medium">
                      Land
                    </Label>
                    <Input
                      id="country"
                      placeholder="Deutschland"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="mt-2"
                    />
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-border-light" />

      {/* ── Sektion 3: Unterlagen ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div>
          <h2 className="font-semibold text-foreground">Unterlagen</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Managementvertrag und sonstige Dokumente des Creators.
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Managementvertrag</Label>

            {contractFile ? (
              /* File selected — show summary row */
              <div className="flex items-center gap-3 rounded-xl border border-border-light bg-input px-4 py-3">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {contractFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(contractFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onContractFileChange(null)}
                  className="shrink-0 p-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Drop zone */
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === "Enter" && fileInputRef.current?.click()
                }
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-light px-6 py-8 cursor-pointer hover:border-foreground/30 hover:bg-muted/30 transition-colors text-center"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground font-medium">
                    Datei hier ablegen oder klicken
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PDF, DOC oder DOCX · max. 10 MB
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                onContractFileChange(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>

      <StepNav onNext={onNext} />
    </div>
  );
}
