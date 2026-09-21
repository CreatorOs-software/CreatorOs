import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, Mail } from "lucide-react";
import { Button, Card, CardAction, CardContent, CardHeader, CardTitle } from "@talentos/ui";
import { BrandAvatar } from "@/components/creators/dashboard/shared";
import { cn } from "@/lib/utils";

export type OpenInvoice = {
  id: string;
  dealId: string;
  dealTitle: string;
  label: string;
  amount: number;
  dueDate: string;
  brand: {
    company_name: string;
    short_code: string;
    contact_name: string | null;
    contact_email: string | null;
  } | null;
};

interface InvoicesCardProps {
  invoices: OpenInvoice[];
  className?: string;
}

const moneyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function isOverdue(dueDate: string) {
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return new Date(`${dueDate}T00:00:00Z`).getTime() < todayUtc;
}

function getReminderBody(invoice: OpenInvoice) {
  const greeting = invoice.brand?.contact_name
    ? `Guten Tag ${invoice.brand.contact_name},`
    : "Guten Tag,";
  const dueDate = dateFormatter.format(new Date(`${invoice.dueDate}T00:00:00Z`));
  const dueSentence = isOverdue(invoice.dueDate)
    ? `Die Zahlung war zum ${dueDate} fällig.`
    : `Die Zahlung ist zum ${dueDate} fällig.`;

  return `${greeting}\n\nwir möchten freundlich an die noch offene Rechnung „${invoice.label}“ über ${moneyFormatter.format(invoice.amount)} zum Deal „${invoice.dealTitle}“ erinnern. ${dueSentence}\n\nBitte prüfen Sie den Zahlungseingang und geben Sie uns kurz Bescheid, wann wir mit der Überweisung rechnen können.\n\nVielen Dank und freundliche Grüße`;
}

export function InvoicesCard({ invoices, className }: InvoicesCardProps) {
  const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <Card className={cn("min-h-0 gap-0 p-5 ring-0", className)}>
      <CardHeader className="mb-4 items-center gap-0 p-0">
        <CardTitle className="text-lg font-semibold text-foreground">
          Rechnungen
        </CardTitle>
        <CardAction className="self-center">
          <Button asChild variant="outline" size="icon" className="size-7">
            <Link href="/creators" aria-label="Zu den Creator-Rechnungen">
              <ArrowUpRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-col p-0">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-light tracking-tight tabular-nums">
            {moneyFormatter.format(total)}
          </span>
          <span className="text-xs text-muted-foreground">
            {invoices.length} {invoices.length === 1 ? "offene Rechnung" : "offene Rechnungen"}
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <span className="mb-3 flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </span>
            <p className="text-sm font-medium">Alles beglichen</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktuell sind keine Rechnungen offen.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col divide-y divide-border-light">
              {invoices.map((invoice) => {
                const overdue = isOverdue(invoice.dueDate);

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`/creators/deals/edit/${invoice.dealId}`}
                      className="group flex min-w-0 flex-1 items-center gap-3"
                    >
                      {invoice.brand ? (
                        <BrandAvatar brand={invoice.brand} />
                      ) : (
                        <span className="size-6 shrink-0 rounded-md bg-muted" />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium leading-tight group-hover:underline">
                          {invoice.label || invoice.dealTitle}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {invoice.dealTitle}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium tabular-nums">
                          {moneyFormatter.format(invoice.amount)}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 flex items-center justify-end gap-1 text-[10px] tabular-nums",
                            overdue ? "font-medium text-destructive" : "text-muted-foreground",
                          )}
                        >
                          <Clock3 className="size-2.5" />
                          {overdue ? "Überfällig" : "Fällig"} {dateFormatter.format(new Date(`${invoice.dueDate}T00:00:00Z`))}
                        </p>
                      </div>
                    </Link>

                    {invoice.brand?.contact_email ? (
                      <Button asChild variant="ghost" size="icon" className="size-7 shrink-0">
                        <Link
                          href={{
                            pathname: "/inbox",
                            query: {
                              compose: "new",
                              to: invoice.brand.contact_email,
                              subject: `Zahlungserinnerung: ${invoice.label || invoice.dealTitle}`,
                              body: getReminderBody(invoice),
                            },
                          }}
                          aria-label={`E-Mail an ${invoice.brand.company_name} schreiben`}
                          title={`E-Mail an ${invoice.brand.contact_email}`}
                        >
                          <Mail className="size-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled
                        className="size-7 shrink-0"
                        aria-label="Keine Kontakt-E-Mail hinterlegt"
                        title="Keine Kontakt-E-Mail hinterlegt"
                      >
                        <Mail className="size-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
