import { createClient } from "@/lib/supabase/server";
import { ImapClient } from "@/lib/imap-client.server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { imap_host, imap_port, imap_secure, imap_username, imap_password } =
    await request.json();

  if (!imap_host || !imap_port || !imap_password || !imap_username) {
    return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const client = new ImapClient({
    host: imap_host,
    port: imap_port,
    secure: imap_secure ?? true,
    username: imap_username,
    password: imap_password,
  });

  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error("IMAP timeout after 15s")), 15_000),
  );

  try {
    await Promise.race([client.connect(), timeout]);
    await Promise.race([client.login(), timeout]);
    await Promise.race([client.logout(), timeout]);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg.slice(0, 300) });
  } finally {
    await client.close();
  }
}
