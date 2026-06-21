import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import type { CreatorFormValues } from "../creator-form.schema";
import { getInitials, pickColor, fullName } from "../creator-form.helpers";

export function useEditCreator(creatorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreatorFormValues) => {
      const name = fullName(values.vorname, values.nachname);
      const res = await fetch(`/api/creators/${creatorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          handle: values.handle.trim() || null,
          email: values.email.trim() || null,
          street: values.street.trim() || null,
          postal_code: values.postal_code.trim() || null,
          city: values.city.trim() || null,
          country: values.country.trim() || null,
          niche: values.niche || null,
          bio: values.bio.trim() || null,
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
        throw new Error((data as { error?: string }).error ?? "Fehler beim Speichern");
      }

      return res.json();
    },
    onSuccess: (_, values) => {
      const name = fullName(values.vorname, values.nachname);
      queryClient.invalidateQueries({ queryKey: QueryKeys.creators.all() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.creators.list() });
      queryClient.invalidateQueries({ queryKey: QueryKeys.creators.detail(creatorId) });
      queryClient.setQueryData(QueryKeys.creators.detail(creatorId), (prev: { creator: Record<string, unknown> } | undefined) => {
        if (!prev?.creator) return prev;
        return {
          creator: {
            ...prev.creator,
            full_name: name,
            handle: values.handle.trim() || null,
            email: values.email.trim() || null,
            street: values.street.trim() || null,
            postal_code: values.postal_code.trim() || null,
            city: values.city.trim() || null,
            country: values.country.trim() || null,
            niche: values.niche || null,
            bio: values.bio.trim() || null,
            followers: values.followers.trim() || null,
            monthly_revenue: Number(values.monthly_revenue) || 0,
            status: values.status,
            platforms: values.platforms,
            color: pickColor(name),
            initials: getInitials(name),
          },
        };
      });
    },
  });
}
