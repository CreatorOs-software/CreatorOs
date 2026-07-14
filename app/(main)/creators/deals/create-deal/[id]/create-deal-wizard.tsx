"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { StepNav } from "@/app/(main)/creators/create-form/steps/step-nav";
import type { Creator } from "@/domains/creators/types";

const STEPS = [
  { id: 1, label: "Basisdaten" },
  { id: 2, label: "Details" },
  { id: 3, label: "Zeitplan" },
  { id: 4, label: "Prüfen" },
];

function PlaceholderStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="sm:col-span-2">
        <div className="h-40 rounded-xl border border-dashed border-border flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Platzhalter — Felder folgen</p>
        </div>
      </div>
    </div>
  );
}

interface CreateDealWizardProps {
  creator: Creator;
}

export function CreateDealWizard({ creator }: CreateDealWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [done, setDone] = useState(false);

  function handleNext() {
    setDirection("forward");
    setStep((s) => s + 1);
  }

  function handlePrev() {
    setDirection("backward");
    setStep((s) => s - 1);
  }

  function handleSubmit() {
    setDone(true);
  }

  if (done) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-card rounded-2xl flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-7 h-7 text-black" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold">Deal angelegt!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Der Deal wurde für {creator.full_name} erstellt.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/creators")}>
              Zur Übersicht
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/80"
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
                <p className="text-xs text-muted-foreground">Neuer Deal</p>
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
              <>
                <PlaceholderStep
                  title="Basisdaten"
                  description="Brand, Titel und Budget des Deals."
                />
                <StepNav onNext={handleNext} submitLabel="Deal anlegen" />
              </>
            ) : step === 2 ? (
              <>
                <PlaceholderStep
                  title="Details"
                  description="Plattform, Kampagnentyp und Deliverables."
                />
                <StepNav onPrev={handlePrev} onNext={handleNext} submitLabel="Deal anlegen" />
              </>
            ) : step === 3 ? (
              <>
                <PlaceholderStep
                  title="Zeitplan"
                  description="Status, Priorität und Deadline."
                />
                <StepNav onPrev={handlePrev} onNext={handleNext} submitLabel="Deal anlegen" />
              </>
            ) : (
              <>
                <PlaceholderStep
                  title="Prüfen"
                  description="Alle Angaben überprüfen und Deal anlegen."
                />
                <StepNav
                  onPrev={handlePrev}
                  onSubmit={handleSubmit}
                  submitLabel="Deal anlegen"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
