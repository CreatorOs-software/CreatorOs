import { KiAnfragenCard } from "@/components/dashboard/ki-anfragen-card";
import { TermineCard } from "@/components/dashboard/termine-card";
import { CreatorCard } from "@/components/dashboard/creator-card";
import { IncomeCard } from "@/components/dashboard/income-card";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { OnboardingTaskCard } from "@/components/dashboard/onboarding-task.card";
import { StatGroup } from "@/components/dashboard/stat-card";
import { StatusBar, StatusBarGroup } from "@/components/dashboard/status-bar";

export default function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex flex-col xl:flex-row xl:items-start xl:justify-between mb-6 gap-6">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-6 text-balance">
            Willkommen zurück, <span className="font-medium">Nixtio</span>
          </h1>

          <StatusBarGroup>
            <StatusBar label="Deals" value="4" variant="dark" />
            <StatusBar label="Anfragen" value="8" variant="yellow" />
            <StatusBar
              label="Monatsumsatz"
              value="13000 EUR"
              variant="striped"
            />
            <StatusBar
              label="Anstieg zu Vormonat"
              value="12%"
              variant="light"
            />
          </StatusBarGroup>
        </div>

        <StatGroup className="hidden xl:flex" />
      </div>

      {/* Main Grid — 2 explicit rows, right col spans both */}
      <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-[auto_1fr] gap-4">
        {/* Row 1, col 1-3 */}
        <CreatorCard
          className="col-span-12 lg:col-span-3"
          name="Lora Piterson"
          role="TikTok Creator"
          salary="$1,200"
          imageUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face"
        />

        {/* Row 1, col 4-9 */}
        <IncomeCard className="col-span-6 lg:col-span-3" />
        <IncomeCard className="col-span-6 lg:col-span-3" />

        {/* col 10-12 — spans row 1 + row 2, flex column inside */}
        <div className="col-span-12 lg:col-span-3 lg:row-span-2 flex flex-col gap-4">
          <OnboardingCard />
          <OnboardingTaskCard className="flex-1" />
        </div>

        {/* Row 2, col 1-3 */}
        <KiAnfragenCard className="col-span-12 lg:col-span-3" />

        {/* Row 2, col 4-9 */}
        <TermineCard className="col-span-12 lg:col-span-6" />
      </div>
    </div>
  );
}
