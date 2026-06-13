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
import { Step3 } from "./steps/step-3";
import { Step4 } from "./steps/step-4";
import { StepSuccess } from "./steps/step-success";

export function CreateCreatorWizard() {
  const router = useRouter();
  const mutation = useCreateCreator();

  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  // Errors from Zod step validation — cleared on every step advance attempt
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const form = useForm<CreatorFormValues>({
    defaultValues: INITIAL_VALUES,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      setDone(true);
    },
  });

  // Validate only the current step's fields via its Zod schema
  // Extra fields in form.state.values are silently stripped by Zod
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
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    setStep((s) => s + 1);
  }

  function handlePrev() {
    setStepErrors({});
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    await form.handleSubmit();
  }

  function handleReset() {
    form.reset();
    setStep(1);
    setDone(false);
    setStepErrors({});
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-card rounded-2xl p-6 flex-1 overflow-y-auto">
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

        <div className="max-w-3xl mx-auto">
          {done ? (
            <StepSuccess
              onReset={handleReset}
              onGoBack={() => router.push("/creators")}
            />
          ) : step === 1 ? (
            <Step1 form={form} errors={stepErrors} onNext={handleNext} />
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
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
