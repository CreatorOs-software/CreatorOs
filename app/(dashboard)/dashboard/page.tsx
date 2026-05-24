import {
  AccordionSection,
  DeviceItem,
} from "@/components/dashboard/accordion-section";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { CreatorCard } from "@/components/dashboard/creator-card";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { OnboardingTaskCard } from "@/components/dashboard/onboarding-task.card";
import { ProgressCard } from "@/components/dashboard/progress-card";
import { StatGroup } from "@/components/dashboard/stat-card";
import { StatusBar, StatusBarGroup } from "@/components/dashboard/status-bar";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between mb-6 gap-6">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-6 text-balance">
            Welcome in, <span className="font-medium">Nixtio</span>
          </h1>

          {/* Status Bars */}
          <StatusBarGroup>
            <StatusBar label="Interviews" value="15%" variant="dark" />
            <StatusBar label="Hired" value="15%" variant="yellow" />
            <StatusBar label="Project time" value="60%" variant="striped" />
            <StatusBar label="Output" value="10%" variant="light" />
          </StatusBarGroup>
        </div>

        {/* Stats */}
        <StatGroup className="hidden xl:flex" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column - Employee + Accordions */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <CreatorCard
            name="Lora Piterson"
            role="UX/UI Designer"
            salary="$1,200"
            imageUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face"
          />

          <div className="bg-card rounded-2xl border border-border-light overflow-hidden">
            <div className="px-4">
              <AccordionSection title="Pension contributions" />
              <AccordionSection title="Devices" defaultOpen>
                <DeviceItem />
              </AccordionSection>
              <AccordionSection title="Compensation Summary" />
              <AccordionSection title="Employee Benefits" />
            </div>
          </div>
        </div>

        {/* Middle Column - Progress + Time + Calendar */}
        <div className="col-span-12 lg:col-span-6 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProgressCard />
            <ProgressCard />
          </div>
          <CalendarCard />
        </div>

        {/* Right Column - Onboarding + Tasks */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <OnboardingCard />
          <OnboardingTaskCard />
        </div>
      </div>
    </div>
  );
}
