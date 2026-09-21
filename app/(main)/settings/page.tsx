import { TemplatesPanel } from "@/components/inbox/templates/templates-panel";
import { ProfileAvatarSettings } from "@/components/settings/profile-avatar-settings";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/domains/auth";

export default async function SettingsPage() {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  const name = auth.displayName ?? auth.fullName ?? auth.email ?? "Nutzer";
  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">Verwalte dein Profil und deine Vorlagen.</p>
      </div>
      <ProfileAvatarSettings userId={auth.userId} name={name} email={auth.email} initialConfig={auth.avatarConfig} />
      <div>
        <h2 className="text-lg font-semibold">Vorlagen</h2>
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
