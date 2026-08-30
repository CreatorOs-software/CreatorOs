"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Creator } from "@/domains/creators/types";
import {
  AnfrageWizard,
  type AnfrageSubmitPayload,
} from "@/app/(main)/creators/anfragen/create-anfrage/[id]/anfrage-wizard";
import { buildAnfrageBody } from "@/app/(main)/creators/anfragen/create-anfrage/[id]/anfrage-form.constants";
import type {
  AnfrageFormValues,
  AnfrageExtras,
} from "@/app/(main)/creators/anfragen/create-anfrage/[id]/anfrage-form.schema";
import type { BrandOption } from "@/app/(main)/creators/anfragen/create-anfrage/[id]/anfrage-form.types";

interface EditAnfrageWizardProps {
  anfrageId: string;
  creator: Creator | null;
  brands: BrandOption[];
  initialValues: AnfrageFormValues;
  initialExtras: AnfrageExtras;
}

export function EditAnfrageWizard({
  anfrageId,
  creator,
  brands,
  initialValues,
  initialExtras,
}: EditAnfrageWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSubmit({ value, extras }: AnfrageSubmitPayload) {
    const res = await fetch(`/api/anfragen/${anfrageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildAnfrageBody({ values: value, extras })),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Fehler beim Speichern");
    }
    if (creator) {
      await queryClient.invalidateQueries({
        queryKey: ["creator-anfragen", creator.id],
      });
    }
    router.refresh();
  }

  return (
    <AnfrageWizard
      mode="edit"
      creator={creator}
      brands={brands}
      initialValues={initialValues}
      initialExtras={initialExtras}
      onSubmit={handleSubmit}
    />
  );
}
