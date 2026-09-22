"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Sparkles, X } from "lucide-react";
import type {
  CreatorForm,
  CreatorField,
  StepErrors,
} from "../creator-form.types";
import { StepNav } from "./step-nav";
import { Button, Checkbox, Input, Label } from "@talentos/ui";
import { Avatar } from "@/components/ui/avatar-creator";
import { AvatarEditorDialog } from "@/components/ui/avatar-editor-dialog";
import { getInitials } from "../creator-form.helpers";

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
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

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
          <div className="flex gap-6">
            {/* Form fields */}
            <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-6">
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
                        <p
                          data-field-error
                          className="mt-1.5 text-xs text-destructive"
                        >
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

              <div className="sm:col-span-3">
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

              <div className="sm:col-span-3">
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
                        <p
                          data-field-error
                          className="mt-1.5 text-xs text-destructive"
                        >
                          {errors.email}
                        </p>
                      )}
                    </>
                  )}
                </form.Field>
              </div>

              <div className="sm:col-span-3">
                <form.Field name="phone">
                  {(field: CreatorField<"phone">) => (
                    <>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Telefon / WhatsApp
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+49 151 12345678"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="mt-2"
                      />
                      {errors.phone && (
                        <p
                          data-field-error
                          className="mt-1.5 text-xs text-destructive"
                        >
                          {errors.phone}
                        </p>
                      )}
                    </>
                  )}
                </form.Field>
              </div>

              <div className="sm:col-span-6">
                <form.Field name="whatsapp_opt_in">
                  {(field: CreatorField<"whatsapp_opt_in">) => (
                    <label className="flex items-start gap-2.5 text-sm">
                      <Checkbox
                        checked={field.state.value}
                        onCheckedChange={(checked) =>
                          field.handleChange(checked === true)
                        }
                        className="mt-0.5"
                      />
                      <span className="leading-snug text-muted-foreground">
                        WhatsApp-Kontakt erlaubt — der Creator hat zugestimmt, über
                        WhatsApp kontaktiert zu werden.
                      </span>
                    </label>
                  )}
                </form.Field>
              </div>
            </div>

            <form.Subscribe selector={(state) => ({ avatar: state.values.avatar_config, first: state.values.vorname, last: state.values.nachname })}>
              {({ avatar, first, last }) => {
                const name = `${first} ${last}`.trim() || "Neuer Creator";
                return (
                  <div className="flex w-52 shrink-0 flex-col items-center gap-3 rounded-sm border border-dashed p-3">
                    <Avatar avatarConfig={avatar} name={name} initials={getInitials(name)} size="2xl" />
                    <div className="text-center">
                      <p className="text-xs font-semibold leading-snug">Avatar</p>
                      <p className="text-[10px] text-muted-foreground">Individuell konfigurierbar</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setAvatarDialogOpen(true)}>
                      <Sparkles className="size-4" /> Avatar erstellen
                    </Button>
                    <AvatarEditorDialog
                      open={avatarDialogOpen}
                      onOpenChange={setAvatarDialogOpen}
                      value={avatar}
                      seed={name}
                      name={name}
                      onSave={(config) => form.setFieldValue("avatar_config", config)}
                    />
                  </div>
                );
              }}
            </form.Subscribe>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onContractFileChange(null)}
                  className="shrink-0 size-auto p-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
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
