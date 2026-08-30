"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import type { Creator } from "@/domains/creators/types";

import { Step2 } from "@/app/(main)/creators/deals/create-deal/[id]/steps/step-2";
import { StepDeliverables } from "@/app/(main)/creators/deals/create-deal/[id]/steps/step-deliverables";
import { Step3 } from "@/app/(main)/creators/deals/create-deal/[id]/steps/step-3";

import { STEPS } from "./anfrage-form.constants";
import { STEP_SCHEMAS } from "./anfrage-form.schema";
import type {
  AnfrageFormValues,
  AnfrageExtras,
} from "./anfrage-form.schema";
import type { StepErrors, BrandOption, AnfrageForm } from "./anfrage-form.types";
import { StepBasis } from "./steps/step-basis";
import { StepPruefen } from "./steps/step-pruefen";

export type AnfrageSubmitPayload = {
  value: AnfrageFormValues;
  extras: AnfrageExtras;
};

interface AnfrageWizardProps {
  mode: "create" | "edit";
  creator: Creator | null;
  brands: BrandOption[];
  initialValues: AnfrageFormValues;
  initialExtras: AnfrageExtras;
  onSubmit: (payload: AnfrageSubmitPayload) => Promise<void>;
}

export function AnfrageWizard({
  mode,
  creator,
  brands,
  initialValues,
  initialExtras,
  onSubmit,
}: AnfrageWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [done, setDone] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [extras, setExtras] = useState<AnfrageExtras>(initialExtras);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setSaving(true);
      setSubmitError(null);
      try {
        await onSubmit({ value, extras });
        setDone(true);
      } catch (e) {
        setSubmitError((e as Error).message ?? "Fehler beim Speichern");
      } finally {
        setSaving(false);
      }
    },
  });

  function validateStep(stepNum: 1 | 2 | 3 | 4 | 5): StepErrors {
    const schema = STEP_SCHEMAS[stepNum];
    const result = schema.safeParse(form.state.values);
    if (result.success) return {};

    const errors: StepErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof AnfrageFormValues;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return errors;
  }

  function handleNext() {
    const errors = validateStep(step as 1 | 2 | 3 | 4 | 5);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      setTimeout(() => {
        document
          .querySelector("[data-field-error]")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }
    setStepErrors({});
    setDirection("forward");
    setStep((s) => s + 1);
  }

  function handlePrev() {
    setStepErrors({});
    setDirection("backward");
    setStep((s) => s - 1);
  }

  function handleGoToStep(s: number) {
    setStepErrors({});
    setDirection("backward");
    setStep(s);
  }

  function patchExtras(patch: Partial<AnfrageExtras>) {
    setExtras((prev) => ({ ...prev, ...patch }));
  }

  const backHref = creator ? `/creators/dashboard/${creator.id}` : "/creators";
  const submitLabel = mode === "create" ? "Anfrage anlegen" : "Änderungen speichern";

  if (done) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-card rounded-2xl flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-7 h-7 text-black" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold">
              {mode === "create" ? "Anfrage angelegt!" : "Änderungen gespeichert!"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "create"
                ? `Die Anfrage wurde${creator ? ` für ${creator.full_name}` : ""} erstellt.`
                : "Die Anfrage wurde erfolgreich aktualisiert."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/creators")}>
              Zur Übersicht
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => router.push(backHref)}
            >
              Zum Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stepForm = form as unknown as AnfrageForm;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-card rounded-2xl flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              {creator && (
                <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0 bg-zinc-100">
                  {creator.initials}
                </span>
              )}
              <div>
                <h1 className="text-base font-semibold">
                  {creator?.full_name ?? "Anfrage"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {mode === "create" ? "Neue Anfrage" : "Anfrage bearbeiten"}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <Stepper steps={STEPS} current={step} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 overflow-x-hidden">
          <div
            key={step}
            className={
              direction === "forward"
                ? "animate-in slide-in-from-right-8 fade-in duration-300"
                : "animate-in slide-in-from-left-8 fade-in duration-300"
            }
          >
            {step === 1 && (
              <StepBasis
                form={stepForm}
                errors={stepErrors}
                brands={brands}
                extras={extras}
                onExtrasChange={patchExtras}
                onNext={handleNext}
              />
            )}
            {step === 2 && (
              <Step2
                form={stepForm}
                images={images}
                onImagesChange={setImages}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            )}
            {step === 3 && (
              <StepDeliverables
                form={stepForm}
                errors={stepErrors}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            )}
            {step === 4 && (
              <Step3
                form={stepForm}
                errors={stepErrors}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            )}
            {step === 5 && (
              <StepPruefen
                values={form.state.values}
                extras={extras}
                brands={brands}
                saving={saving}
                error={submitError}
                submitLabel={submitLabel}
                onPrev={handlePrev}
                onSubmit={() => form.handleSubmit()}
                onGoToStep={handleGoToStep}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
