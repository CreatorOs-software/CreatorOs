import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";

const serviceClient = createAdminSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.agency_id) return Response.json({ error: "No agency" }, { status: 400 });

  const { body: replyBody } = await request.json();
  if (!replyBody?.trim()) return Response.json({ error: "Empty reply" }, { status: 400 });

  const { data: thread } = await supabase
    .from("email_threads")
    .select("id, agency_id, sender_email, sender_name, subject, gmail_thread_id")
    .eq("id", id)
    .maybeSingle();
  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });

  const { data: integ } = await serviceClient
    .from("email_integrations")
    .select("id, email, display_name, smtp_host, smtp_port, smtp_secure, imap_username, imap_password")
    .eq("agency_id", thread.agency_id)
    .eq("status", "connected")
    .not("smtp_host", "is", null)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!integ?.smtp_host || !integ.smtp_port)
    return Response.json({ error: "Kein Postfach mit SMTP konfiguriert." }, { status: 400 });
  if (!integ.imap_password)
    return Response.json({ error: "Postfach-Passwort fehlt." }, { status: 400 });

  const { SmtpClient } = await import("@/lib/smtp-client.server");
  const client = new SmtpClient({
    host: integ.smtp_host,
    port: integ.smtp_port,
    secure: integ.smtp_secure ?? true,
    username: integ.imap_username ?? integ.email,
    password: integ.imap_password,
  });

  const subject = thread.subject.toLowerCase().startsWith("re:")
    ? thread.subject
    : `Re: ${thread.subject}`;
  const inReplyTo = thread.gmail_thread_id?.startsWith("<") ? thread.gmail_thread_id : null;

  try {
    await client.connect();
    await client.login();
    await client.send({
      from: { name: integ.display_name ?? profile.display_name ?? null, email: integ.email },
      to: [thread.sender_email],
      subject,
      text: replyBody,
      inReplyTo,
      references: inReplyTo,
    });
    await client.quit();
  } finally {
    await client.close();
  }

  await supabase.from("email_threads").update({ unread: false }).eq("id", id);

  await serviceClient.from("email_threads").insert({
    agency_id: thread.agency_id,
    integration_id: integ.id,
    folder: "sent",
    sender_email: integ.email,
    sender_name: integ.display_name ?? profile.display_name ?? null,
    subject,
    preview: replyBody.slice(0, 240).replace(/\s+/g, " ").trim(),
    body: replyBody,
    received_at: new Date().toISOString(),
    unread: false,
    starred: false,
    priority: "med",
  });

  return Response.json({ ok: true });
}
