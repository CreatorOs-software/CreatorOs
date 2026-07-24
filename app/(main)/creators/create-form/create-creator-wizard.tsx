"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";

import { STEPS, INITIAL_VALUES } from "./creator-form.constants";
import { STEP_SCHEMAS } from "./creator-form.schema";
import type { CreatorFormValues } from "./creator-form.schema";
import type { StepErrors } from "./creator-form.types";
import { useCreateCreator } from "./hooks/use-create-creator";

import { Step1 } from "./steps/step-1";
import { Step2 } from "./steps/step-2";
import { StepZiele } from "./steps/step-ziele";
import { Step3 } from "./steps/step-3";
import { Step4 } from "./steps/step-4";
import { StepSuccess } from "./steps/step-success";

export function CreateCreatorWizard() {
  const router = useRouter();
  const mutation = useCreateCreator();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [done, setDone] = useState(false);
  const [createdCreatorId, setCreatedCreatorId] = useState<string | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const form = useForm({
    defaultValues: INITIAL_VALUES,
    onSubmit: async ({ value }) => {
      const result = await mutation.mutateAsync(value);
      setCreatedCreatorId((result as { creator: { id: string } }).creator.id);
      setDone(true);
    },
  });

  function validateStep(stepNum: 1 | 2 | 3 | 4 | 5): StepErrors {
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
    const errors = validateStep(step as 1 | 2 | 3 | 4 | 5);
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

  function handleReset() {
    form.reset();
    setStep(1);
    setDone(false);
    setCreatedCreatorId(null);
    setStepErrors({});
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-card rounded-2xl flex-1 flex flex-col overflow-hidden">
        {/* Fixed: header + stepper */}
        <div className="px-6 pt-6 shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">Neuer Creator</h1>
              <p className="text-xs text-muted-foreground">
                Creator-Profil anlegen
              </p>
            </div>
          </div>

          {!done && (
            <div className="mb-8">
              <Stepper steps={STEPS} current={step} />
            </div>
          )}
        </div>

        {/* Scrollable: form content only */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 overflow-x-hidden">
          <div
            key={done ? "success" : step}
            className={
              direction === "forward"
                ? "animate-in slide-in-from-right-8 fade-in duration-300"
                : "animate-in slide-in-from-left-8 fade-in duration-300"
            }
          >
            {done ? (
              <StepSuccess
                creatorId={createdCreatorId}
                platforms={form.state.values.platforms}
                onReset={handleReset}
                onGoBack={() => router.push("/creators")}
              />
            ) : step === 1 ? (
              <Step1
                form={form}
                errors={stepErrors}
                contractFile={contractFile}
                onContractFileChange={setContractFile}
                profileImage={profileImage}
                onProfileImageChange={setProfileImage}
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
              <StepZiele
                form={form}
                errors={stepErrors}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            ) : step === 4 ? (
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
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
