"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/query-keys";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditCreatorWizard } from "../edit-creator-wizard";
import type { Creator } from "@/domains/creators/types";
import { useRouter } from "next/navigation";

export default function EditCreatorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data, isPending } = useQuery<{ creator: Creator | null }>({
    queryKey: QueryKeys.creators.detail(id),
    queryFn: () => fetch(`/api/creators/${id}`).then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.creator) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm">Creator nicht gefunden.</p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/creators")}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  return <EditCreatorWizard creator={data.creator} />;
}
