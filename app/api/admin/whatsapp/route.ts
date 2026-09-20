import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { can, getAuthContext, toErrorResponse } from "@/domains/auth";
import { WhatsAppService, WhatsAppError } from "@/domains/whatsapp";
import { createClient } from "@/lib/supabase/server";

const connectSchema = z.object({
  code: z.string().min(10),
  wabaId: z.string().regex(/^\d+$/),
  phoneNumberId: z.string().regex(/^\d+$/),
  businessId: z.string().regex(/^\d+$/).nullish(),
  state: z.string().uuid(),
});

function badRequest(error: z.ZodError): Response {
  return Response.json({ error: error.issues[0]?.message ?? "Ungültige Eingabe" }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const action = new URL(request.url).searchParams.get("action");
    if (action === "onboarding") {
      const auth = await getAuthContext(await createClient());
      if (!can(auth.role, auth.permissions, "edit_integrations")) {
        return Response.json({ error: "Keine Berechtigung für WhatsApp-Einstellungen." }, { status: 403 });
      }
      const state = randomUUID();
      const store = await cookies();
      store.set("wa_onboarding_state", state, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
        path: "/api/admin/whatsapp", maxAge: 10 * 60,
      });
      return Response.json({
        state,
        appId: process.env.NEXT_PUBLIC_META_APP_ID ?? process.env.META_APP_ID ?? null,
        configId: process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID ?? null,
      });
    }
    if (action === "templates") {
      return Response.json({ templates: await WhatsAppService.listTemplates() });
    }
    return Response.json({ connection: await WhatsAppService.getConnection() });
  } catch (error) {
    if (error instanceof WhatsAppError) return Response.json({ error: error.message }, { status: 400 });
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const action = new URL(request.url).searchParams.get("action");
    if (action === "sync-templates") {
      return Response.json({ templates: await WhatsAppService.syncTemplates() });
    }
    const parsed = connectSchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error);
    const store = await cookies();
    const expectedState = store.get("wa_onboarding_state")?.value;
    store.delete("wa_onboarding_state");
    if (!expectedState || expectedState !== parsed.data.state) {
      return Response.json({ error: "Der Verbindungsversuch ist abgelaufen. Bitte erneut starten." }, { status: 400 });
    }
    return Response.json({ connection: await WhatsAppService.connect(parsed.data) });
  } catch (error) {
    if (error instanceof WhatsAppError) return Response.json({ error: error.message }, { status: 400 });
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    await WhatsAppService.disconnect();
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof WhatsAppError) return Response.json({ error: error.message }, { status: 400 });
    return toErrorResponse(error);
  }
}
