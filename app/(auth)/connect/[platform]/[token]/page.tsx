import { createClient } from "@/lib/supabase/server";
import { SocialAccountService } from "@/domains/social-accounts";
import { getAdapter, PLATFORM_META } from "@/lib/platforms/registry";
import { isSupported } from "@/lib/platforms/registry";
import { ConnectPlatformClient } from "./connect-platform-client";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ platform: string; token: string }>;
}

export default async function ConnectPlatformPage({ params }: PageProps) {
  const { platform, token } = await params;

  if (!isSupported(platform)) notFound();

  const supabase = await createClient();
  const service = new SocialAccountService(supabase);
  const result = await service.validateInviteToken(token);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-sm w-full text-center space-y-3 p-6">
          <p className="text-2xl font-bold">Link ungültig</p>
          <p className="text-sm text-muted-foreground">
            Dieser Einladungslink ist abgelaufen oder wurde bereits verwendet.
            Bitte wende dich an deine Agentur.
          </p>
        </div>
      </div>
    );
  }

  const adapter = getAdapter(result.platform);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${origin}/api/oauth/callback/${platform}`;
  const authUrl = adapter.getAuthUrl({ state: token, redirectUri });

  const meta = PLATFORM_META[result.platform];

  return (
    <ConnectPlatformClient
      platform={result.platform}
      platformLabel={meta.label}
      platformColor={meta.color}
      authUrl={authUrl}
      expiresAt={result.invite.expires_at}
    />
  );
}
