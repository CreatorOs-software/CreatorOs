import Link from "next/link";
import { ChevronRight, Plug } from "lucide-react";

const SECTIONS = [
  {
    href: "/admin/settings/integrations",
    icon: Plug,
    title: "Integrationen",
    description: "WhatsApp (Twilio) und E-Mail-Postfächer verbinden.",
  },
] as const;

export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-base font-semibold">Einstellungen</h1>
        <p className="text-xs text-muted-foreground">
          Konfiguration dieser Agentur.
        </p>
      </div>

      <div className="bg-card rounded-2xl divide-y divide-border-light">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
          >
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
