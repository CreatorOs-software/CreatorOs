"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { Creator } from "@/domains/creators/types";
import { AnfrageWizard, type AnfrageSubmitPayload } from "./anfrage-wizard";
import {
  buildAnfrageBody,
  getInitialExtras,
  getInitialValues,
} from "./anfrage-form.constants";
import type { BrandOption } from "./anfrage-form.types";

interface CreateAnfrageWizardProps {
  creator: Creator;
  brands: BrandOption[];
}

export function CreateAnfrageWizard({ creator, brands }: CreateAnfrageWizardProps) {
  const queryClient = useQueryClient();

  async function handleSubmit({ value, extras }: AnfrageSubmitPayload) {
    const res = await fetch(`/api/creators/${creator.id}/anfragen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildAnfrageBody({ values: value, extras })),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Fehler beim Speichern");
    }
    await queryClient.invalidateQueries({ queryKey: ["creator-anfragen", creator.id] });
  }

  return (
    <AnfrageWizard
      mode="create"
      creator={creator}
      brands={brands}
      initialValues={getInitialValues(creator.id)}
      initialExtras={getInitialExtras()}
      onSubmit={handleSubmit}
    />
  );
}
