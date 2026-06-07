import { getAuthContext } from "@/domains/auth";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { IntegrationRepository } from "./repository";
import type { IntegrationInsert, IntegrationPatch, SyncResult } from "./types";

export class IntegrationNotFoundError extends Error {}

export const IntegrationService = {
  async list() {
    const supabase = await createClient();
    const { agencyId } = await getAuthContext(supabase);
    return IntegrationRepository.findAll(supabase, agencyId);
  },

  async create(input: IntegrationInsert): Promise<string> {
    const supabase = await createClient();
    const { agencyId, userId } = await getAuthContext(supabase);

    const provider =
      input.provider_label === "outlook" ? "outlook"
      : input.provider_label === "gmail" ? "gmail"
      : "imap";

    const payload = {
      agency_id: agencyId,
      provider,
      email: input.email,
      display_name: input.display_name ?? null,
      status: "connected",
      connected_at: new Date().toISOString(),
      imap_host: input.imap_host,
      imap_port: input.imap_port,
      imap_secure: input.imap_secure,
      imap_username: input.imap_username || input.email,
      imap_password: input.imap_password,
      smtp_host: input.smtp_host ?? null,
      smtp_port: input.smtp_port ?? null,
      smtp_secure: input.smtp_secure ?? true,
      last_sync_error: null,
      created_by: userId,
    };

    const existing = await IntegrationRepository.findExisting(supabase, agencyId, input.email, provider);

    let id: string;
    if (existing) {
      await IntegrationRepository.update(supabase, existing.id, payload);
      id = existing.id;
    } else {
      id = await IntegrationRepository.create(supabase, payload);
    }

    try {
      await serviceClient.functions.invoke("sync-imap", { body: { integration_id: id } });
    } catch (e) {
      console.error("[integrations] initial sync failed", e);
    }

    return id;
  },

  async patch(id: string, patch: IntegrationPatch): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return IntegrationRepository.patch(supabase, id, patch);
  },

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    await getAuthContext(supabase);
    return IntegrationRepository.softDelete(supabase, id);
  },

  async sync(id: string): Promise<SyncResult> {
    const supabase = await createClient();
    await getAuthContext(supabase);

    const row = await IntegrationRepository.findById(supabase, id);
    if (!row) throw new IntegrationNotFoundError("Not found");

    const { data, error } = await serviceClient.functions.invoke("sync-imap", { body: { integration_id: id } });
    if (error) throw new Error(error.message);

    const json = data as { ok?: boolean; results?: Array<{ pulled?: number; skipped?: number }> };
    const r = json?.results?.[0];
    return { ok: true, pulled: r?.pulled ?? 0, skipped: r?.skipped ?? 0 };
  },
};
