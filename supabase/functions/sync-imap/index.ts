// sync-imap – Supabase Edge Function
// Pulls new messages from IMAP/Gmail/Outlook integrations into email_threads.
// Triggered by: cron (all connected integrations) or POST { integration_id } (single).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_FETCH = 25;

function getJwtRole(authHeader: string): string | null {
  try {
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- Deno-native IMAP client ----------------------------------------

class ImapError extends Error {}

class ImapClient {
  private conn: Deno.Conn | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buf = new Uint8Array(0);
  private tagCounter = 0;
  private enc = new TextEncoder();
  private dec = new TextDecoder("utf-8");

  constructor(
    private host: string,
    private port: number,
    private secure: boolean,
    private username: string,
    private password: string,
  ) {}

  async connect(): Promise<void> {
    const conn = this.secure
      ? await Deno.connectTls({ hostname: this.host, port: this.port })
      : await Deno.connect({ hostname: this.host, port: this.port });
    this.conn = conn;
    this.writer = conn.writable.getWriter();
    this.reader = conn.readable.getReader();
    const greet = await this.readLine();
    if (!greet.startsWith("* OK")) throw new ImapError(`Unexpected greeting: ${greet}`);
  }

  async login(): Promise<void> {
    const u = this.username.replace(/"/g, '\\"');
    const p = this.password.replace(/"/g, '\\"');
    const { ok, info } = await this.command(`LOGIN "${u}" "${p}"`);
    if (!ok) throw new ImapError(`LOGIN failed: ${info}`);
  }

  async selectInbox(): Promise<number> {
    const { ok, info, untagged } = await this.command("SELECT INBOX");
    if (!ok) throw new ImapError(`SELECT INBOX failed: ${info}`);
    let exists = 0;
    for (const line of untagged) {
      const m = line.match(/^\* (\d+) EXISTS/);
      if (m) exists = parseInt(m[1], 10);
    }
    return exists;
  }

  async searchAllUids(): Promise<number[]> {
    const { ok, info, untagged } = await this.command("UID SEARCH ALL");
    if (!ok) throw new ImapError(`UID SEARCH failed: ${info}`);
    const uids: number[] = [];
    for (const line of untagged) {
      const m = line.match(/^\* SEARCH(.*)$/);
      if (m) {
        for (const s of m[1].trim().split(/\s+/)) {
          const n = parseInt(s, 10);
          if (s && Number.isFinite(n)) uids.push(n);
        }
      }
    }
    return uids.sort((a, b) => a - b);
  }

  async fetchMessage(uid: number): Promise<{
    uid: number;
    headers: Record<string, string>;
    body: string;
    rawHeaders: string;
    size: number;
  } | null> {
    const tag = this.nextTag();
    await this.write(
      `${tag} UID FETCH ${uid} (UID RFC822.SIZE BODY.PEEK[HEADER] BODY.PEEK[TEXT])\r\n`,
    );
    let realUid: number | null = null;
    let size = 0;
    let header = "";
    let body = "";

    while (true) {
      const line = await this.readLine();
      if (line.startsWith(`${tag} `)) {
        const rest = line.slice(tag.length + 1);
        if (!rest.startsWith("OK")) throw new ImapError(`FETCH ${uid} failed: ${rest}`);
        break;
      }
      // Do NOT skip non-"*" lines — BODY[TEXT] continuation arrives on a line
      // that starts with a space, not "*", and must be parsed for its literal.
      const uidM = line.match(/UID (\d+)/);
      if (uidM) realUid = parseInt(uidM[1], 10);
      const sizeM = line.match(/RFC822\.SIZE (\d+)/);
      if (sizeM) size = parseInt(sizeM[1], 10);
      let cursor = 0;
      while (true) {
        const litIdx = line.indexOf("{", cursor);
        if (litIdx === -1) break;
        const endIdx = line.indexOf("}", litIdx);
        if (endIdx === -1) break;
        const n = parseInt(line.slice(litIdx + 1, endIdx), 10);
        if (!Number.isFinite(n)) break;
        const before = line.slice(0, litIdx);
        const data = await this.readBytes(n);
        const text = this.dec.decode(data);
        if (/BODY\[HEADER\]/i.test(before)) header = text;
        else if (/BODY\[TEXT\]/i.test(before)) body = text;
        cursor = endIdx + 1;
      }
    }

    if (!header && !body) return null;
    return { uid: realUid ?? uid, size, rawHeaders: header, headers: parseHeaders(header), body };
  }

  async logout(): Promise<void> {
    try {
      await this.command("LOGOUT");
    } catch { /* ignore */ }
  }

  close(): void {
    try { this.writer?.releaseLock(); } catch { /* ignore */ }
    try { this.reader?.releaseLock(); } catch { /* ignore */ }
    try { this.conn?.close(); } catch { /* ignore */ }
    this.conn = null;
    this.writer = null;
    this.reader = null;
  }

  private nextTag = () => `A${String(++this.tagCounter).padStart(4, "0")}`;

  private async write(s: string) {
    if (!this.writer) throw new ImapError("not connected");
    await this.writer.write(this.enc.encode(s));
  }

  private async command(
    cmd: string,
  ): Promise<{ ok: boolean; info: string; untagged: string[] }> {
    const tag = this.nextTag();
    await this.write(`${tag} ${cmd}\r\n`);
    const untagged: string[] = [];
    while (true) {
      const line = await this.readLine();
      if (line.startsWith(`${tag} `)) {
        const rest = line.slice(tag.length + 1);
        return { ok: rest.startsWith("OK"), info: rest, untagged };
      }
      let extended = line;
      const lit = line.match(/\{(\d+)\}$/);
      if (lit) {
        const data = await this.readBytes(parseInt(lit[1], 10));
        extended = line + this.dec.decode(data) + " " + (await this.readLine());
      }
      untagged.push(extended);
    }
  }

  private async readLine(): Promise<string> {
    while (true) {
      for (let i = 0; i + 1 < this.buf.length; i++) {
        if (this.buf[i] === 0x0d && this.buf[i + 1] === 0x0a) {
          const line = this.dec.decode(this.buf.slice(0, i));
          this.buf = this.buf.slice(i + 2);
          return line;
        }
      }
      await this.pull();
    }
  }

  private async readBytes(n: number): Promise<Uint8Array> {
    while (this.buf.length < n) await this.pull();
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }

  private async pull() {
    if (!this.reader) throw new ImapError("not connected");
    const { value, done } = await this.reader.read();
    if (done || !value) throw new ImapError("Connection closed by server");
    const merged = new Uint8Array(this.buf.length + value.length);
    merged.set(this.buf);
    merged.set(value, this.buf.length);
    this.buf = merged;
  }
}

// ---- Header / body parsing ----------------------------------------

function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const folded: string[] = [];
  for (const l of raw.split(/\r?\n/)) {
    if (!l) continue;
    if (/^[\t ]/.test(l) && folded.length) folded[folded.length - 1] += " " + l.trim();
    else folded.push(l);
  }
  for (const l of folded) {
    const idx = l.indexOf(":");
    if (idx < 0) continue;
    out[l.slice(0, idx).trim().toLowerCase()] = decodeMime(l.slice(idx + 1).trim());
  }
  return out;
}

function decodeMime(s: string): string {
  return s.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, charset, enc, data) => {
    try {
      if (enc.toUpperCase() === "B") {
        const bin = atob(data);
        return new TextDecoder(charset.toLowerCase()).decode(
          Uint8Array.from(bin, (c) => c.charCodeAt(0)),
        );
      }
      let out = data.replace(/_/g, " ").replace(
        /=([0-9A-Fa-f]{2})/g,
        (_x: string, h: string) => String.fromCharCode(parseInt(h, 16)),
      );
      if (/utf-?8/i.test(charset)) {
        return new TextDecoder("utf-8").decode(Uint8Array.from(out, (c) => c.charCodeAt(0)));
      }
      return out;
    } catch {
      return data;
    }
  });
}

function parseFromAddress(from: string | undefined): { name: string | null; email: string } {
  if (!from) return { name: null, email: "" };
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: from.trim().toLowerCase() };
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDate(s: string): string {
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBodyParts(
  headers: Record<string, string>,
  body: string,
): { text: string; html: string | null } {
  const ct = headers["content-type"] ?? "text/plain";
  const cte = (headers["content-transfer-encoding"] ?? "7bit").toLowerCase();
  const result = extractFromPart(ct, cte, body);
  return {
    text: result.plain?.trim() ?? (result.html ? stripHtml(result.html) : ""),
    html: result.html?.trim() ?? null,
  };
}

function extractFromPart(
  ct: string,
  cte: string,
  content: string,
): { plain: string | null; html: string | null } {
  const bm = ct.match(/boundary="?([^";]+)"?/i);
  if (bm) {
    const parts = content.split(new RegExp(`--${escapeRegex(bm[1])}(?:--)?\\r?\\n?`));
    let plain: string | null = null;
    let html: string | null = null;
    for (const part of parts) {
      const sep = part.search(/\r?\n\r?\n/);
      if (sep < 0) continue;
      const hdrs = parseHeaders(part.slice(0, sep));
      const inner = part.slice(sep).replace(/^\r?\n\r?\n/, "");
      const pct = hdrs["content-type"] ?? "text/plain";
      const pcte = (hdrs["content-transfer-encoding"] ?? "7bit").toLowerCase();
      if (/^multipart\//i.test(pct)) {
        const sub = extractFromPart(pct, pcte, inner);
        if (sub.plain && !plain) plain = sub.plain;
        if (sub.html && !html) html = sub.html;
      } else {
        const decoded = decodePart(inner, pcte, pct);
        if (/text\/plain/i.test(pct) && !plain) plain = decoded;
        else if (/text\/html/i.test(pct) && !html) html = decoded;
      }
      if (plain && html) break;
    }
    return { plain, html };
  }
  const decoded = decodePart(content, cte, ct);
  if (/text\/html/i.test(ct)) return { plain: null, html: decoded };
  return { plain: decoded, html: null };
}

function decodePart(data: string, cte: string, ct: string): string {
  if (cte === "base64") {
    try {
      const bin = atob(data.replace(/\s+/g, ""));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const charsetM = ct.match(/charset="?([^";]+)"?/i);
      return new TextDecoder(charsetM ? charsetM[1] : "utf-8").decode(bytes);
    } catch {
      return data;
    }
  }
  if (cte === "quoted-printable") {
    const out = data
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
    try {
      return new TextDecoder("utf-8").decode(Uint8Array.from(out, (c) => c.charCodeAt(0)));
    } catch {
      return out;
    }
  }
  return data;
}

// ---- Core pull logic ----------------------------------------

type IntegrationRow = {
  id: string;
  agency_id: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_username: string;
  imap_password: string;
  last_uid: number | null;
};

async function pullImap(row: IntegrationRow): Promise<{ pulled: number; skipped: number }> {
  const { count: threadCount } = await db
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", row.agency_id);
  const effectiveLastUid = (threadCount === 0) ? 0 : (row.last_uid ?? 0);

  const client = new ImapClient(
    row.imap_host,
    row.imap_port,
    row.imap_secure,
    row.imap_username,
    row.imap_password,
  );
  let pulled = 0;
  let skipped = 0;
  let highestUid = effectiveLastUid;

  try {
    await client.connect();
    await client.login();
    await client.selectInbox();
    const allUids = await client.searchAllUids();
    const candidates = allUids.filter((u) => u > effectiveLastUid).slice(-MAX_FETCH);

    for (const uid of candidates) {
      const msg = await client.fetchMessage(uid).catch((e) => {
        console.error(`fetch uid=${uid} failed`, e);
        return null;
      });
      if (!msg) { skipped++; continue; }
      if (msg.uid > highestUid) highestUid = msg.uid;

      const { name, email } = parseFromAddress(msg.headers["from"] ?? "");
      const { text: body, html: bodyHtml } = extractBodyParts(msg.headers, msg.body);
      const preview = body.slice(0, 240).replace(/\s+/g, " ").trim();
      const received_at = msg.headers["date"]
        ? safeDate(msg.headers["date"])
        : new Date().toISOString();
      const messageId = msg.headers["message-id"];

      if (messageId) {
        const { data: dup } = await db
          .from("email_threads")
          .select("id, body")
          .eq("agency_id", row.agency_id)
          .eq("gmail_thread_id", messageId)
          .maybeSingle();
        if (dup) {
          // Always tag integration_id so mailbox filtering works after re-sync
          const patch: Record<string, unknown> = { integration_id: row.id };
          if (!dup.body && body) {
            patch.body = body || preview;
            patch.body_html = bodyHtml;
            patch.preview = preview || (msg.headers["subject"] ?? "");
          }
          await db.from("email_threads").update(patch).eq("id", dup.id);
          skipped++;
          continue;
        }
      }

      const { error } = await db.from("email_threads").insert({
        agency_id: row.agency_id,
        integration_id: row.id,
        gmail_thread_id: messageId ?? `imap-${row.id}-${msg.uid}`,
        sender_email: email,
        sender_name: name,
        subject: msg.headers["subject"] ?? "(no subject)",
        preview: preview || (msg.headers["subject"] ?? ""),
        body: body || preview,
        body_html: bodyHtml,
        received_at,
        unread: true,
        starred: false,
        priority: "med",
      });
      if (error) { console.error("insert failed", error); continue; }
      pulled++;
    }
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
    client.close();
  }

  await db.from("email_integrations").update({
    last_sync_at: new Date().toISOString(),
    status: "connected",
    last_sync_error: null,
    last_uid: highestUid,
  }).eq("id", row.id);

  return { pulled, skipped };
}

// ---- Entry point ----------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  const role = getJwtRole(auth);
  if (role !== "service_role") {
    // Fallback: direct key comparison (for local dev / non-JWT callers)
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const integrationId = body.integration_id ?? null;

  let query = db
    .from("email_integrations")
    .select(
      "id, agency_id, email, imap_host, imap_port, imap_secure, imap_username, imap_password, last_uid",
    )
    .eq("status", "connected")
    .in("provider", ["imap", "gmail", "outlook"])
    .not("imap_host", "is", null)
    .not("imap_username", "is", null);

  if (integrationId) query = (query as ReturnType<typeof query.eq>).eq("id", integrationId);

  const { data: rows, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: Record<string, unknown>[] = [];
  for (const row of (rows ?? []) as IntegrationRow[]) {
    try {
      const res = await pullImap(row);
      results.push({ id: row.id, email: row.email, ...res });
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 500);
      await db
        .from("email_integrations")
        .update({ status: "error", last_sync_error: msg })
        .eq("id", row.id);
      results.push({ id: row.id, email: row.email, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
