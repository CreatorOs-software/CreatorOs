import { IntegrationService } from "@/domains/integrations";
import { toErrorResponse } from "@/lib/auth-context";

export async function GET() {
  try {
    const integrations = await IntegrationService.list();
    return Response.json({ integrations });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      display_name,
      imap_host,
      imap_port,
      imap_secure,
      imap_username,
      imap_password,
      smtp_host,
      smtp_port,
      smtp_secure,
      provider_label,
    } = body;

    if (!email || !imap_host || !imap_password) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = await IntegrationService.create({
      email,
      display_name: display_name ?? null,
      imap_host,
      imap_port,
      imap_secure,
      imap_username,
      imap_password,
      smtp_host: smtp_host ?? null,
      smtp_port: smtp_port ?? null,
      smtp_secure: smtp_secure ?? true,
      provider: "imap",
      provider_label,
    });

    return Response.json({ id });
  } catch (e) {
    return toErrorResponse(e);
  }
}
