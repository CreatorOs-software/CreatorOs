import { TemplatesPanel } from "@/components/inbox/templates/templates-panel";

export default function SettingsPage() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Vorlagen</h1>
        <p className="text-sm text-muted-foreground">
          Verwalte Vorlagen für E-Mail und WhatsApp. Nutze Variablen wie{" "}
          <code className="text-xs">{"${creator.name}"}</code>, sie werden beim
          Einfügen automatisch mit echten Daten befüllt.
        </p>
      </div>
      <TemplatesPanel />
    </div>
  );
}
