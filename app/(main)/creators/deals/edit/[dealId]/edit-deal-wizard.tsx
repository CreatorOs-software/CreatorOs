"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import type { Creator } from "@/domains/creators/types";

import { STEPS } from "../../create-deal/[id]/deal-form.constants";
import { STEP_SCHEMAS } from "../../create-deal/[id]/deal-form.schema";
import type { DealFormValues } from "../../create-deal/[id]/deal-form.schema";
import type { StepErrors, BrandOption, CreatorOption } from "../../create-deal/[id]/deal-form.types";

import { Step1 } from "../../create-deal/[id]/steps/step-1";
import { Step2 } from "../../create-deal/[id]/steps/step-2";
import { Step3 } from "../../create-deal/[id]/steps/step-3";
import { Step4 } from "../../create-deal/[id]/steps/step-4";

interface EditDealWizardProps {
  dealId: string;
  creator: Creator | null;
  brands: BrandOption[];
  creators: CreatorOption[];
  initialValues: DealFormValues;
}

export function EditDealWizard({
  dealId,
  creator,
  brands,
  creators,
  initialValues,
}: EditDealWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [done, setDone] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setSaving(true);
      setSubmitError(null);
      try {
        const res = await fetch(`/api/deals/${dealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: value.title,
            brand_id: value.brand_id || null,
            product: value.product || null,
            platform: value.platform || null,
            creator_id: value.creator_id || null,
            contact_person: value.contact_person || null,
            deliverables: value.deliverables,
            deadline: value.deadline || null,
            usage_rights: value.usage_rights || null,
            exclusivity: value.exclusivity || null,
            description: value.notes || null,
            budget: value.fee,
            payment_items: value.payment_items,
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Fehler beim Speichern");
        }
        setDone(true);
      } catch (e) {
        setSubmitError((e as Error).message ?? "Fehler beim Speichern");
      } finally {
        setSaving(false);
      }
    },
  });

  function validateStep(stepNum: 1 | 2 | 3 | 4): StepErrors {
    const schema = STEP_SCHEMAS[stepNum];
    const result = schema.safeParse(form.state.values);
    if (result.success) return {};

    const errors: StepErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof DealFormValues;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return errors;
  }

  function handleNext() {
    const errors = validateStep(step as 1 | 2 | 3 | 4);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
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

  async function handleSubmit() {
    await form.handleSubmit();
  }

  function handleGoToStep(s: number) {
    setStepErrors({});
    setDirection("backward");
    setStep(s);
  }

  const backHref = creator
    ? `/creators/dashboard/${creator.id}`
    : "/creators";

  if (done) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-card rounded-2xl flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-7 h-7 text-black" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold">Änderungen gespeichert!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Der Deal wurde erfolgreich aktualisiert.
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
                <span
                  className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: creator.color }}
                >
                  {creator.initials}
                </span>
              )}
              <div>
                <h1 className="text-base font-semibold">
                  {creator?.full_name ?? "Deal bearbeiten"}
                </h1>
                <p className="text-xs text-muted-foreground">Deal bearbeiten</p>
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
              <Step1
                form={form}
                errors={stepErrors}
                brands={brands}
                creators={creators}
                onNext={handleNext}
              />
            )}
            {step === 2 && (
              <Step2
                form={form}
                errors={stepErrors}
                images={images}
                onImagesChange={setImages}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            )}
            {step === 3 && (
              <Step3
                form={form}
                errors={stepErrors}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            )}
            {step === 4 && (
              <Step4
                values={form.state.values}
                brands={brands}
                creators={creators}
                images={images}
                saving={saving}
                error={submitError}
                onPrev={handlePrev}
                onSubmit={handleSubmit}
                onGoToStep={handleGoToStep}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
