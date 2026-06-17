import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import type { CreatorFormValues } from "../creator-form.schema";
import { getInitials, pickColor, fullName } from "../creator-form.helpers";

export function useCreateCreator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreatorFormValues) => {
      const name = fullName(values.vorname, values.nachname);
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          handle: values.handle.trim() || null,
          niche: values.niche || null,
          followers: values.followers.trim() || null,
          monthly_revenue: Number(values.monthly_revenue) || 0,
          status: values.status,
          platforms: values.platforms,
          color: pickColor(name),
          initials: getInitials(name),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Fehler beim Anlegen");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.creators.all() });
    },
  });
}
