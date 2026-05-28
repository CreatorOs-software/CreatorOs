import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ImapOptions = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

async function loadImapClient() {
  return import("@/lib/imap-client.server");
}

const PROVIDER_PRESETS: Record<
  string,
  { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number; secure: boolean }
> = {
  gmail: {
    imap_host: "imap.gmail.com",
    imap_port: 993,
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    secure: true,
  },
  outlook: {
    imap_host: "outlook.office365.com",
    imap_port: 993,
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    secure: true,
  },
  icloud: {
    imap_host: "imap.mail.me.com",
    imap_port: 993,
    smtp_host: "smtp.mail.me.com",
    smtp_port: 587,
    secure: true,
  },
  yahoo: {
    imap_host: "imap.mail.yahoo.com",
    imap_port: 993,
    smtp_host: "smtp.mail.yahoo.com",
    smtp_port: 465,
    secure: true,
  },
  gmx: {
    imap_host: "imap.gmx.com",
    imap_port: 993,
    smtp_host: "mail.gmx.com",
    smtp_port: 465,
    secure: true,
  },
  webde: {
    imap_host: "imap.web.de",
    imap_port: 993,
    smtp_host: "smtp.web.de",
    smtp_port: 587,
    secure: true,
  },
  ionos: {
    imap_host: "imap.ionos.de",
    imap_port: 993,
    smtp_host: "smtp.ionos.de",
    smtp_port: 465,
    secure: true,
  },
};

export const getImapPresets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => PROVIDER_PRESETS);

const ConnectionSchema = z.object({
  email: z.string().trim().email().max(255),
  display_name: z.string().trim().max(120).optional().nullable(),
  imap_host: z.string().trim().min(3).max(255),
  imap_port: z.number().int().min(1).max(65535),
  imap_secure: z.boolean(),
  imap_username: z.string().trim().min(1).max(255),
  imap_password: z.string().min(1).max(1024),
  smtp_host: z.string().trim().min(3).max(255).optional().nullable(),
  smtp_port: z.number().int().min(1).max(65535).optional().nullable(),
  smtp_secure: z.boolean().optional().nullable(),
  provider_label: z.enum(["gmail", "outlook", "imap", "custom"]).default("imap"),
});

async function tryConnect(opts: ImapOptions, timeoutMs = 15_000): Promise<void> {
  const { ImapClient } = await loadImapClient();
  const client = new ImapClient(opts);
  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error(`IMAP timeout after ${timeoutMs}ms`)), timeoutMs),
  );
  try {
    await Promise.race([client.connect(), timeout]);
    await Promise.race([client.login(), timeout]);
    await Promise.race([client.logout(), timeout]);
  } finally {
    await client.close();
  }
}

export const testImapConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        imap_host: z.string().trim().min(3).max(255),
        imap_port: z.number().int().min(1).max(65535),
        imap_secure: z.boolean(),
        imap_username: z.string().trim().min(1).max(255),
        imap_password: z.string().min(1).max(1024),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      await tryConnect({
        host: data.imap_host,
        port: data.imap_port,
        secure: data.imap_secure,
        username: data.imap_username,
        password: data.imap_password,
      });
      return { ok: true as const };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false as const, error: msg.slice(0, 300) };
    }
  });

export const saveImapIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ConnectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.agency_id) throw new Error("No agency");

    // verify connection before persisting
    await tryConnect({
      host: data.imap_host,
      port: data.imap_port,
      secure: data.imap_secure,
      username: data.imap_username,
      password: data.imap_password,
    });

    const provider = (
      data.provider_label === "outlook"
        ? "outlook"
        : data.provider_label === "gmail"
          ? "gmail"
          : "imap"
    ) as "gmail" | "outlook" | "imap";

    // Upsert by (agency_id, email, provider)
    const { data: existing } = await supabase
      .from("email_integrations")
      .select("id")
      .eq("agency_id", profile.agency_id)
      .eq("email", data.email)
      .eq("provider", provider)
      .maybeSingle();

    const payload = {
      agency_id: profile.agency_id,
      provider,
      email: data.email,
      display_name: data.display_name ?? null,
      status: "connected" as const,
      connected_at: new Date().toISOString(),
      imap_host: data.imap_host,
      imap_port: data.imap_port,
      imap_secure: data.imap_secure,
      imap_username: data.imap_username,
      imap_password: data.imap_password,
      smtp_host: data.smtp_host ?? null,
      smtp_port: data.smtp_port ?? null,
      smtp_secure: data.smtp_secure ?? true,
      last_sync_error: null,
      created_by: userId,
    };

    let id: string;
    if (existing) {
      const { error } = await supabase
        .from("email_integrations")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      id = existing.id;
    } else {
      const { data: ins, error } = await supabase
        .from("email_integrations")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = ins.id;
    }

    // initial pull (best-effort, don't fail the save)
    try {
      await callSyncImapEdgeFn(id);
    } catch (e) {
      console.error("initial IMAP pull failed", e);
    }

    return { id };
  });

async function callSyncImapEdgeFn(
  integrationId: string,
): Promise<{ pulled: number; skipped: number }> {
  const { data, error } = await supabaseAdmin.functions.invoke("sync-imap", {
    body: { integration_id: integrationId },
  });
  if (error) {
    // FunctionsHttpError exposes the raw Response on .context — extract the body for debugging
    let detail = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx?.json) detail = JSON.stringify(await ctx.json());
      else if (ctx?.text) detail = await ctx.text();
    } catch {
      /* ignore */
    }
    throw new Error(`sync-imap: ${detail}`);
  }
  const json = data as {
    ok?: boolean;
    results?: Array<{ pulled?: number; skipped?: number; error?: string }>;
  };
  if (!json?.ok) throw new Error(`sync-imap returned error: ${JSON.stringify(json)}`);
  const r = json.results?.[0];
  if (r?.error) throw new Error(r.error);
  return { pulled: r?.pulled ?? 0, skipped: r?.skipped ?? 0 };
}

export const markImapRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ thread_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: thread } = await supabase
      .from("email_threads")
      .select("id, integration_id, gmail_thread_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (!thread?.integration_id) return { ok: true, skipped: "no integration" };

    const { data: integ } = await supabaseAdmin
      .from("email_integrations")
      .select("imap_host, imap_port, imap_secure, imap_username, imap_password")
      .eq("id", thread.integration_id)
      .maybeSingle();
    if (!integ?.imap_password || !integ.imap_host || !integ.imap_port)
      return { ok: true, skipped: "no credentials" };

    const { ImapClient } = await loadImapClient();
    const client = new ImapClient({
      host: integ.imap_host,
      port: integ.imap_port,
      secure: integ.imap_secure ?? true,
      username: integ.imap_username ?? "",
      password: integ.imap_password,
    });

    try {
      await client.connect();
      await client.login();
      await client.selectInbox();

      const msgId =
        thread.gmail_thread_id && thread.gmail_thread_id.startsWith("<")
          ? thread.gmail_thread_id
          : null;
      if (msgId) {
        const uids = await client.uidSearchByHeader("Message-ID", msgId);
        const uid = uids[0] ?? null;
        if (uid) await client.uidMarkSeen(uid);
      }

      await client.logout();
    } catch (e) {
      console.error("IMAP mark-read failed (best-effort)", e);
    } finally {
      await client.close();
    }

    return { ok: true as const };
  });

export const archiveImapThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ thread_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Load thread — RLS scoped to the user's agency
    const { data: thread } = await supabase
      .from("email_threads")
      .select("id, integration_id, gmail_thread_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (!thread) return { ok: true, skipped: "thread not found" };
    if (!thread.integration_id) return { ok: true, skipped: "no integration" };

    // Load integration credentials via admin (bypasses RLS on password field)
    const { data: integ } = await supabaseAdmin
      .from("email_integrations")
      .select("imap_host, imap_port, imap_secure, imap_username, imap_password, provider")
      .eq("id", thread.integration_id)
      .maybeSingle();
    if (!integ?.imap_password) return { ok: true, skipped: "no credentials" };

    const { ImapClient } = await loadImapClient();
    if (!integ.imap_host || !integ.imap_port) return { ok: true, skipped: "no imap config" };
    const client = new ImapClient({
      host: integ.imap_host,
      port: integ.imap_port,
      secure: integ.imap_secure ?? true,
      username: integ.imap_username ?? "",
      password: integ.imap_password,
    });

    try {
      await client.connect();
      await client.login();
      await client.selectInbox();

      const msgId =
        thread.gmail_thread_id && thread.gmail_thread_id.startsWith("<")
          ? thread.gmail_thread_id
          : null;

      if (msgId) {
        const uids = await client.uidSearchByHeader("Message-ID", msgId);
        const uid = uids[0] ?? null;
        if (uid) {
          const archiveFolder = integ.provider === "gmail" ? "[Gmail]/All Mail" : "Archive";
          await client.uidMove(uid, archiveFolder);
        }
      }

      await client.logout();
    } catch (e) {
      // Best-effort — don't fail the archive action if IMAP move fails
      console.error("IMAP archive move failed (best-effort)", e);
    } finally {
      await client.close();
    }

    return { ok: true as const };
  });

export const syncImapIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Verify caller owns the integration via RLS
    const { data: row, error } = await supabase
      .from("email_integrations")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Integration not found");

    const res = await callSyncImapEdgeFn(data.id);
    return { ok: true as const, ...res };
  });

const ReplySchema = z.object({
  thread_id: z.string().uuid(),
  body: z.string().trim().min(1).max(50_000),
  subject_override: z.string().trim().max(998).optional().nullable(),
});

export const sendImapReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ReplySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, display_name")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.agency_id) throw new Error("No agency");

    // Load thread (RLS-scoped)
    const { data: thread, error: tErr } = await supabase
      .from("email_threads")
      .select("id, agency_id, sender_email, sender_name, subject, gmail_thread_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!thread) throw new Error("Thread not found");

    // Pick a connected SMTP-capable integration for this agency
    const { data: integ, error: iErr } = await supabaseAdmin
      .from("email_integrations")
      .select(
        "id, email, display_name, smtp_host, smtp_port, smtp_secure, imap_username, imap_password, status",
      )
      .eq("agency_id", thread.agency_id)
      .eq("status", "connected")
      .not("smtp_host", "is", null)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (iErr) throw new Error(iErr.message);
    if (!integ)
      throw new Error(
        "Kein verbundenes Postfach mit SMTP. Hinterlege SMTP-Daten unter Integrations.",
      );
    if (!integ.smtp_host || !integ.smtp_port)
      throw new Error("SMTP host/port fehlt für das verbundene Postfach.");
    if (!integ.imap_password) throw new Error("Postfach-Passwort fehlt.");

    const { SmtpClient } = await import("@/lib/smtp-client.server");
    const client = new SmtpClient({
      host: integ.smtp_host,
      port: integ.smtp_port,
      secure: integ.smtp_secure ?? true,
      username: integ.imap_username ?? integ.email,
      password: integ.imap_password,
    });

    const subject =
      data.subject_override ??
      (thread.subject.toLowerCase().startsWith("re:") ? thread.subject : `Re: ${thread.subject}`);
    const inReplyTo = thread.gmail_thread_id?.startsWith("<") ? thread.gmail_thread_id : null;

    try {
      await client.connect();
      await client.login();
      await client.send({
        from: { name: integ.display_name ?? profile.display_name ?? null, email: integ.email },
        to: [thread.sender_email],
        subject,
        text: data.body,
        inReplyTo,
        references: inReplyTo,
      });
      await client.quit();
    } finally {
      await client.close();
    }

    // Mark thread as read after a successful reply
    await supabase.from("email_threads").update({ unread: false }).eq("id", thread.id);

    // Store the sent message so it appears in the "Gesendet" view
    await supabaseAdmin.from("email_threads").insert({
      agency_id: thread.agency_id,
      integration_id: integ.id,
      folder: "sent",
      sender_email: thread.sender_email,
      sender_name: thread.sender_name,
      subject,
      preview: data.body.slice(0, 240).replace(/\s+/g, " ").trim(),
      body: data.body,
      received_at: new Date().toISOString(),
      unread: false,
      starred: false,
      priority: "med",
    });

    return { ok: true as const };
  });
