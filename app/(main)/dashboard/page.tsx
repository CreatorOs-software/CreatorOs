import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/domains/auth";
import { KiAnfragenCard } from "@/components/dashboard/ki-anfragen-card";
import { TermineCard } from "@/components/dashboard/termine-card";
import { CreatorCard } from "@/components/dashboard/creator-card";
import { ReactionRequiredCard } from "@/components/dashboard/reaction-required-card";
import {
  InvoicesCard,
  type OpenInvoice,
} from "@/components/dashboard/invoices-card";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { OnboardingTaskCard } from "@/components/dashboard/onboarding-task.card";
import { StatGroup } from "@/components/dashboard/stat-card";
import { StatusBar, StatusBarGroup } from "@/components/dashboard/status-bar";

export default async function DashboardPage() {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  const displayName = auth.displayName ?? auth.fullName ?? auth.email ?? "";

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, payment_items, brands(company_name, short_code, contact_name, contact_email)")
    .eq("agency_id", auth.agencyId);

  const openInvoices = (deals ?? [])
    .flatMap((deal) => {
      const paymentItems = Array.isArray(deal.payment_items)
        ? (deal.payment_items as Array<{
            label?: string;
            amount?: number;
            invoice_date?: string;
            payment_term?: number;
            paid_at?: string;
          }>)
        : [];

      return paymentItems.flatMap((item, index): OpenInvoice[] => {
        if (!item.invoice_date || item.paid_at) return [];

        const dueDate = new Date(`${item.invoice_date}T00:00:00Z`);
        if (Number.isNaN(dueDate.getTime())) return [];
        dueDate.setUTCDate(dueDate.getUTCDate() + (item.payment_term ?? 0));
        const brand = Array.isArray(deal.brands)
          ? (deal.brands[0] ?? null)
          : deal.brands;

        return [{
          id: `${deal.id}-${index}`,
          dealId: deal.id,
          dealTitle: deal.title,
          label: item.label ?? "Rechnung",
          amount: Number(item.amount ?? 0),
          dueDate: dueDate.toISOString().slice(0, 10),
          brand: brand
            ? {
                company_name: brand.company_name,
                short_code: brand.short_code,
                contact_name: brand.contact_name,
                contact_email: brand.contact_email,
              }
            : null,
        }];
      });
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex flex-col xl:flex-row xl:items-start xl:justify-between mb-6 gap-6">
        <div className="flex justify-between w-full">
          <h1 className="text-3xl font-light tracking-tight mb-6 text-balance">
            Willkommen zurück, <span className="font-bold">{displayName}</span>
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
      <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[auto_minmax(0,1fr)] gap-4">
        {/* Row 1, col 1-3 */}
        <CreatorCard
          className="col-span-12 lg:col-span-3"
          name="Lora Piterson"
          role="TikTok Creator"
          salary="$1,200"
          imageUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop&crop=face"
        />

        {/* Row 1, col 4-9 */}
        <ReactionRequiredCard className="col-span-6 lg:col-span-3" />
        <InvoicesCard
          invoices={openInvoices}
          className="col-span-6 lg:col-span-3"
        />

        {/* col 10-12 — spans row 1 + row 2, flex column inside */}
        <div className="col-span-12 lg:col-span-3 lg:row-span-2 flex flex-col gap-4">
          <OnboardingCard />
          <OnboardingTaskCard className="flex-1" />
        </div>

        {/* Row 2, col 1-3 */}
        <KiAnfragenCard className="col-span-12 min-h-0 lg:col-span-3" />

        {/* Row 2, col 4-9 */}
        <TermineCard className="col-span-12 min-h-0 lg:col-span-6" />
      </div>
    </div>
  );
}
