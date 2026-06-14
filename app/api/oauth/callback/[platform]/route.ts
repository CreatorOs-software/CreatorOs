import { NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { SocialAccountService } from "@/domains/social-accounts";
import { isSupported } from "@/lib/platforms/registry";

// This route is the OAuth redirect_uri registered with each platform.
// It never requires an authenticated agency user — the creator opens it.
// State param encodes the raw invite token for validation.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const { searchParams } = req.nextUrl;

  const code = searchParams.get("code");
  const state = searchParams.get("state"); // raw invite token
  const error = searchParams.get("error");

  const origin = req.nextUrl.origin;

  if (error) {
    return Response.redirect(`${origin}/connect/error?reason=${error}`);
  }

  if (!code || !state || !isSupported(platform)) {
    return Response.redirect(`${origin}/connect/error?reason=invalid_callback`);
  }

  try {
    const service = new SocialAccountService(serviceClient);

    const redirectUri = `${origin}/api/oauth/callback/${platform}`;

    await service.handleOAuthCallback({
      rawToken: state,
      platform,
      code,
      redirectUri,
      connectedBy: null, // creator connects via invite link, not an agency user
    });

    return Response.redirect(`${origin}/connect/success?platform=${platform}`);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? "unknown";
    console.error(`[oauth:${platform}] callback failed:`, message);
    return Response.redirect(
      `${origin}/connect/error?reason=${encodeURIComponent(message)}`,
    );
  }
}
