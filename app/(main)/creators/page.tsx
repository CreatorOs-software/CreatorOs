"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Plus, Loader2, Star } from "lucide-react";
import { QueryKeys } from "@/lib/query-keys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreatorCard, formatMoney } from "@/components/creators/creator-card";
import { CreatorSheet, type Creator } from "@/components/creators/creator-sheet";
import type { CreatorsPageData } from "@/domains/creators";

export default function CreatorsPage() {
  const router = useRouter();

  const { data: listData, isPending } = useQuery<{ creators: Creator[] }>({
    queryKey: QueryKeys.creators.list(),
    queryFn: () => fetch("/api/creators/list").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const { data: allData } = useQuery<CreatorsPageData>({
    queryKey: QueryKeys.creators.all(),
    queryFn: () => fetch("/api/creators").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });

  const creators: Creator[] = allData?.creators ?? [];
  const brands = allData?.brands ?? [];
  const deals = allData?.deals ?? [];
  const mailboxes = allData?.mailboxes ?? [];

  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCardClick(id: string) {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      router.push(`/creators/dashboard/${id}`);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        setProfileId(id);
      }, 220);
    }
  }

  const filtered = (listData?.creators ?? []).filter(
    (c) =>
      !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.handle?.toLowerCase().includes(search.toLowerCase()) ||
      c.niche?.toLowerCase().includes(search.toLowerCase()),
  );

  const activePerCreator = (id: string) =>
    deals.filter((d) => d.creator_id === id && !["paid", "posted"].includes(d.status)).length;

  const totalMtd = creators.reduce((s, c) => s + Number(c.monthly_revenue), 0);
  const totalActive = creators.reduce((s, c) => s + activePerCreator(c.id), 0);

  const profile = profileId ? (creators.find((c) => c.id === profileId) ?? null) : null;

  if (isPending) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-3 mb-4 mt-1">
        <div>
          <h1 className="text-base font-semibold">Creator</h1>
          <p className="text-xs text-muted-foreground">
            {creators.length} Creator · {totalActive} aktive Deals · {formatMoney(totalMtd)} MTD
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen…"
            className="w-44"
          />
          <Button
            onClick={() => router.push("/creators/create-form")}
            className="bg-yellow-400 text-black hover:bg-yellow-300"
          >
            <Plus className="w-4 h-4" />
            Creator hinzufügen
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Star className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {search ? "Kein Creator gefunden." : "Noch keine Creator. Füge den ersten hinzu!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {filtered.map((c) => (
              <CreatorCard
                key={c.id}
                c={c}
                activeDeals={activePerCreator(c.id)}
                onClick={() => handleCardClick(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreatorSheet
        creator={profile}
        brands={brands}
        deals={deals}
        mailboxes={mailboxes}
        open={!!profileId}
        onOpenChange={(open) => { if (!open) setProfileId(null); }}
      />
    </div>
  );
}
