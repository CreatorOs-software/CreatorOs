"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";

import { STEPS } from "../create-form/creator-form.constants";
import { STEP_SCHEMAS } from "../create-form/creator-form.schema";
import type { CreatorFormValues } from "../create-form/creator-form.schema";
import type { StepErrors } from "../create-form/creator-form.types";
import { useEditCreator } from "../create-form/hooks/use-edit-creator";
import type { Creator } from "@/domains/creators/types";

import { Step1 } from "../create-form/steps/step-1";
import { Step2 } from "../create-form/steps/step-2";
import { Step3 } from "../create-form/steps/step-3";
import { Step4 } from "../create-form/steps/step-4";

interface EditCreatorWizardProps {
  creator: Creator;
}

function toFormValues(creator: Creator): CreatorFormValues {
  const parts = creator.full_name.trim().split(/\s+/);
  const vorname = parts[0] ?? "";
  const nachname = parts.slice(1).join(" ");

  return {
    vorname,
    nachname,
    handle: creator.handle ?? "",
    email: creator.email ?? "",
    street: creator.street ?? "",
    postal_code: creator.postal_code ?? "",
    city: creator.city ?? "",
    country: creator.country ?? "",
    niche: creator.niche ?? "",
    bio: creator.bio ?? "",
    status: creator.status,
    platforms: creator.platforms ?? [],
    followers: creator.followers ?? "",
    monthly_revenue: creator.monthly_revenue ? String(creator.monthly_revenue) : "",
  };
}

export function EditCreatorWizard({ creator }: EditCreatorWizardProps) {
  const router = useRouter();
  const mutation = useEditCreator(creator.id);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [done, setDone] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const form = useForm({
    defaultValues: toFormValues(creator),
    onSubmit: async () => {
      await mutation.mutateAsync(form.state.values);
      setDone(true);
    },
  });

  function validateStep(stepNum: 1 | 2 | 3 | 4): StepErrors {
    const schema = STEP_SCHEMAS[stepNum];
    const result = schema.safeParse(form.state.values);
    if (result.success) return {};
    const errors: StepErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CreatorFormValues;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return errors;
  }

  function handleNext() {
    const errors = validateStep(step as 1 | 2 | 3 | 4);
    if (Object.keys(errors).length > 0) { setStepErrors(errors); return; }
    setStepErrors({});
    setDirection("forward");
    setStep((s) => s + 1);
  }

  function handlePrev() {
    setStepErrors({});
    setDirection("backward");
    setStep((s) => s - 1);
  }

  if (done) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-card rounded-2xl flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center">
            <Check className="w-7 h-7 text-black" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold">Änderungen gespeichert!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Das Profil von {creator.full_name} wurde aktualisiert.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/creators")}>
              Zur Übersicht
            </Button>
            <Button
              className="bg-yellow-400 text-black hover:bg-yellow-300"
              onClick={() => router.push(`/creators/dashboard/${creator.id}`)}
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
              <span
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: creator.color }}
              >
                {creator.initials}
              </span>
              <div>
                <h1 className="text-base font-semibold">{creator.full_name}</h1>
                <p className="text-xs text-muted-foreground">Creator bearbeiten</p>
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
            {step === 1 ? (
              <Step1
                form={form}
                errors={stepErrors}
                contractFile={contractFile}
                onContractFileChange={setContractFile}
                onNext={handleNext}
              />
            ) : step === 2 ? (
              <Step2
                form={form}
                errors={stepErrors}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            ) : step === 3 ? (
              <Step3
                form={form}
                errors={stepErrors}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            ) : (
              <Step4
                form={form}
                saving={mutation.isPending}
                error={mutation.error?.message ?? null}
                onPrev={handlePrev}
                onSubmit={() => form.handleSubmit()}
                submitLabel="Änderungen speichern"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
