// sync-imap – Supabase Edge Function
// Pulls messages from IMAP/Gmail/Outlook integrations into email_threads.
// Syncs all standard folders: INBOX, SENT, DRAFTS, SPAM, TRASH.
// Triggered by: cron (all connected integrations) or POST { integration_id } (single).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Max messages to fetch per folder per sync run
const MAX_INBOX = 25;
const MAX_OTHER = 15;

// Lookback window for non-INBOX folders (days)
const LOOKBACK_DAYS = 90;
const SPAM_TRASH_DAYS = 30;

// A single flaky run (connection refused, timeout) shouldn't hide the mailbox
// from the Inbox. Only escalate status to 'error' after this many consecutive
// failures — or immediately when the server rejects the credentials.
const SYNC_FAILURE_THRESHOLD = 3;

function isAuthFailure(msg: string): boolean {
  return /LOGIN failed|AUTHENTICATIONFAILED|authentication failed|invalid credentials|\[AUTH/i.test(
    msg,
  );
}

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

// ---- IMAP folder normalization ----------------------------------------

type FolderInfo = {
  rawName: string;    // actual IMAP name to SELECT
  folder: string;     // DB value: INBOX | SENT | DRAFTS | SPAM | TRASH
  lookbackDays: number;
};

/**
 * Normalize a raw IMAP folder name to our standard folder values.
 * Returns null for folders we don't want to sync (e.g. All Mail which duplicates INBOX).
 */
function normalizeFolder(raw: string): { folder: string; lookbackDays: number } | null {
  const r = raw.toLowerCase().trim();

  if (r === "inbox") return { folder: "INBOX", lookbackDays: 0 }; // uses last_uid

  if (
    r === "sent" ||
    r === "sent items" ||
    r === "sent messages" ||
    r.endsWith("/sent mail") || // [Gmail]/Sent Mail
    r.endsWith("/sent")
  ) return { folder: "SENT", lookbackDays: LOOKBACK_DAYS };

  if (
    r === "drafts" ||
    r.endsWith("/drafts")
  ) return { folder: "DRAFTS", lookbackDays: LOOKBACK_DAYS };

  if (
    r === "spam" ||
    r === "junk" ||
    r === "junk email" ||
    r === "junk e-mail" ||
    r.endsWith("/spam") ||
    r.endsWith("/junk")
  ) return { folder: "SPAM", lookbackDays: SPAM_TRASH_DAYS };

  if (
    r === "trash" ||
    r === "deleted" ||
    r === "deleted items" ||
    r === "deleted messages" ||
    r.endsWith("/trash")
  ) return { folder: "TRASH", lookbackDays: SPAM_TRASH_DAYS };

  // Skip: All Mail, Archive, Flagged, Important, etc. — would create duplicates
  return null;
}

function imapDateStr(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate().toString().padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

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

  /** Returns list of all folder names on the server. */
  async listMailboxes(): Promise<string[]> {
    const { ok, untagged } = await this.command('LIST "" "*"');
    if (!ok) return ["INBOX"];
    const folders: string[] = [];
    for (const line of untagged) {
      // * LIST (\flags) "delimiter" "FolderName"
      // * LIST (\flags) NIL INBOX
      const m = line.match(/^\* LIST\s+\([^)]*\)\s+(?:NIL|"[^"]+")\s+(.+)$/i);
      if (!m) continue;
      const raw = m[1].trim().replace(/^"(.+)"$/, "$1");
      folders.push(raw);
    }
    return folders.length > 0 ? folders : ["INBOX"];
  }

  /** Returns total message count in the selected mailbox. */
  async selectMailbox(name: string): Promise<number> {
    const quoted = name.includes(" ") ? `"${name.replace(/"/g, '\\"')}"` : name;
    const { ok, info, untagged } = await this.command(`SELECT ${quoted}`);
    if (!ok) throw new ImapError(`SELECT ${name} failed: ${info}`);
    let exists = 0;
    for (const line of untagged) {
      const m = line.match(/^\* (\d+) EXISTS/);
      if (m) exists = parseInt(m[1], 10);
    }
    return exists;
  }

  /** Search all UIDs in the currently selected mailbox. */
  async searchAllUids(): Promise<number[]> {
    const { ok, info, untagged } = await this.command("UID SEARCH ALL");
    if (!ok) throw new ImapError(`UID SEARCH failed: ${info}`);
    return parseUidList(untagged);
  }

  /** Search UIDs for messages received on or after the given date string (e.g. "01-Jan-2024"). */
  async searchSinceUids(dateStr: string): Promise<number[]> {
    const { ok, untagged } = await this.command(`UID SEARCH SINCE ${dateStr}`);
    if (!ok) return []; // server may not support, fallback to empty = dedup will handle
    return parseUidList(untagged);
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
    try { await this.command("LOGOUT"); } catch { /* ignore */ }
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

  private async command(cmd: string): Promise<{ ok: boolean; info: string; untagged: string[] }> {
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

function parseUidList(untagged: string[]): number[] {
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
    } catch { return data; }
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

function extractBodyParts(headers: Record<string, string>, body: string): { text: string; html: string | null } {
  const ct = headers["content-type"] ?? "text/plain";
  const cte = (headers["content-transfer-encoding"] ?? "7bit").toLowerCase();
  const result = extractFromPart(ct, cte, body);
  return {
    text: result.plain?.trim() ?? (result.html ? stripHtml(result.html) : ""),
    html: result.html?.trim() ?? null,
  };
}

function extractFromPart(ct: string, cte: string, content: string): { plain: string | null; html: string | null } {
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
    } catch { return data; }
  }
  if (cte === "quoted-printable") {
    const out = data
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
    try {
      return new TextDecoder("utf-8").decode(Uint8Array.from(out, (c) => c.charCodeAt(0)));
    } catch { return out; }
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
  sync_failure_count: number | null;
};

async function syncFolder(
  client: ImapClient,
  row: IntegrationRow,
  info: FolderInfo,
  isFirstRun: boolean,
): Promise<{ pulled: number; skipped: number; newHighestUid: number }> {
  let pulled = 0;
  let skipped = 0;
  let newHighestUid = 0;

  try {
    await client.selectMailbox(info.rawName);
  } catch (e) {
    console.error(`[sync-imap] SELECT ${info.rawName} failed:`, e);
    return { pulled, skipped, newHighestUid };
  }

  let allUids: number[];

  if (info.folder === "INBOX") {
    const effectiveLastUid = isFirstRun ? 0 : (row.last_uid ?? 0);
    allUids = await client.searchAllUids();
    allUids = allUids.filter((u) => u > effectiveLastUid).slice(-MAX_INBOX);
  } else {
    const dateStr = imapDateStr(info.lookbackDays);
    try {
      allUids = await client.searchSinceUids(dateStr);
    } catch {
      allUids = await client.searchAllUids();
    }
    allUids = allUids.slice(-MAX_OTHER);
  }

  for (const uid of allUids) {
    const msg = await client.fetchMessage(uid).catch((e) => {
      console.error(`[sync-imap] fetch uid=${uid} in ${info.rawName} failed`, e);
      return null;
    });
    if (!msg) { skipped++; continue; }
    if (msg.uid > newHighestUid) newHighestUid = msg.uid;

    const { name, email } = parseFromAddress(msg.headers["from"] ?? "");
    const { text: body, html: bodyHtml } = extractBodyParts(msg.headers, msg.body);
    const preview = body.slice(0, 240).replace(/\s+/g, " ").trim();
    const received_at = msg.headers["date"] ? safeDate(msg.headers["date"]) : new Date().toISOString();
    const messageId = msg.headers["message-id"];
    const inReplyTo = msg.headers["in-reply-to"]?.trim() || null;
    const referencesHeader = msg.headers["references"]?.trim() || null;

    if (messageId) {
      const { data: dup } = await db
        .from("email_threads")
        .select("id, body, folder")
        .eq("agency_id", row.agency_id)
        .eq("gmail_thread_id", messageId)
        .maybeSingle();

      if (dup) {
        const patch: Record<string, unknown> = {
          integration_id: row.id,
          message_id: messageId ?? null,
          in_reply_to: inReplyTo,
          references_header: referencesHeader,
        };
        if (!dup.body && body) {
          patch.body = body || preview;
          patch.body_html = bodyHtml;
          patch.preview = preview || (msg.headers["subject"] ?? "");
        }
        // Promote folder if INBOX takes priority over others
        if (info.folder === "INBOX" && dup.folder !== "INBOX") {
          patch.folder = "INBOX";
        }
        await db.from("email_threads").update(patch).eq("id", dup.id);
        skipped++;
        continue;
      }
    }

    const { data: inserted, error } = await db.from("email_threads").insert({
      agency_id: row.agency_id,
      integration_id: row.id,
      gmail_thread_id: messageId ?? `imap-${row.id}-${info.folder.toLowerCase()}-${msg.uid}`,
      message_id: messageId ?? null,
      in_reply_to: inReplyTo,
      references_header: referencesHeader,
      folder: info.folder,
      sender_email: email,
      sender_name: name,
      subject: msg.headers["subject"] ?? "(no subject)",
      preview: preview || (msg.headers["subject"] ?? ""),
      body: body || preview,
      body_html: bodyHtml,
      received_at,
      unread: info.folder === "INBOX", // only mark inbox messages as unread
      starred: false,
      priority: "med",
    }).select("id").single();
    if (error) { console.error("[sync-imap] insert failed", error); continue; }
    pulled++;

    // Trigger AI labeling for new INBOX messages.
    // waitUntil ensures the fetch survives after sync-imap returns its response.
    if (info.folder === "INBOX") {
      const labelFetch = fetch(`${SUPABASE_URL}/functions/v1/execute-ai-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ email_thread_id: inserted.id, agency_id: row.agency_id }),
      }).catch((e) => console.error("[sync-imap] execute-ai-job trigger failed", e));
      EdgeRuntime.waitUntil(labelFetch);
    }
  }

  return { pulled, skipped, newHighestUid };
}

async function pullImap(row: IntegrationRow): Promise<{ pulled: number; skipped: number }> {
  const { count: threadCount } = await db
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", row.agency_id)
    .eq("integration_id", row.id);

  const isFirstRun = threadCount === 0;

  const client = new ImapClient(row.imap_host, row.imap_port, row.imap_secure, row.imap_username, row.imap_password);
  let totalPulled = 0;
  let totalSkipped = 0;
  let newInboxHighestUid = row.last_uid ?? 0;

  try {
    await client.connect();
    await client.login();

    // Discover all folders on this account
    const rawFolders = await client.listMailboxes();

    // Build the list of folders we want to sync, in priority order
    const foldersToSync: FolderInfo[] = [];
    const seenTypes = new Set<string>();

    // Always ensure INBOX is first
    foldersToSync.push({ rawName: "INBOX", folder: "INBOX", lookbackDays: 0 });
    seenTypes.add("INBOX");

    for (const raw of rawFolders) {
      const normalized = normalizeFolder(raw);
      if (!normalized) continue;
      if (seenTypes.has(normalized.folder)) continue;
      seenTypes.add(normalized.folder);
      foldersToSync.push({ rawName: raw, ...normalized });
    }

    console.log(`[sync-imap] ${row.email}: syncing folders: ${foldersToSync.map(f => f.rawName).join(", ")}`);

    for (const folderInfo of foldersToSync) {
      const { pulled, skipped, newHighestUid } = await syncFolder(client, row, folderInfo, isFirstRun);
      totalPulled += pulled;
      totalSkipped += skipped;
      if (folderInfo.folder === "INBOX" && newHighestUid > newInboxHighestUid) {
        newInboxHighestUid = newHighestUid;
      }
      console.log(`[sync-imap] ${row.email} / ${folderInfo.rawName}: +${pulled} pulled, ${skipped} skipped`);
    }
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
    client.close();
  }

  await db.from("email_integrations").update({
    last_sync_at: new Date().toISOString(),
    status: "connected",
    last_sync_error: null,
    sync_failure_count: 0,
    last_uid: newInboxHighestUid,
  }).eq("id", row.id);

  return { pulled: totalPulled, skipped: totalSkipped };
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
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const integrationId = body.integration_id ?? null;

  let query = db
    .from("email_integrations")
    .select("id, agency_id, email, imap_host, imap_port, imap_secure, imap_username, imap_password, last_uid, sync_failure_count")
    // include 'error' so a mailbox that hit a transient failure gets retried
    // and can heal itself on the next successful run
    .in("status", ["connected", "error"])
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
      const nextCount = (row.sync_failure_count ?? 0) + 1;
      const escalate = isAuthFailure(msg) || nextCount >= SYNC_FAILURE_THRESHOLD;
      await db
        .from("email_integrations")
        .update({
          last_sync_error: msg,
          sync_failure_count: nextCount,
          // stay 'connected' for transient blips so the Inbox keeps the mailbox
          ...(escalate ? { status: "error" } : {}),
        })
        .eq("id", row.id);
      results.push({
        id: row.id,
        email: row.email,
        error: msg,
        failureCount: nextCount,
        escalatedToError: escalate,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
