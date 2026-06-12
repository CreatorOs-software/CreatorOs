"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatorDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-semibold">Creator Dashboard</h1>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push(`/creators/edit-form/${id}`)}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Kommt bald.
      </div>
    </div>
  );
}
