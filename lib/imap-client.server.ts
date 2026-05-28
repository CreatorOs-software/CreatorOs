// Minimal IMAP client for Cloudflare Workers using cloudflare:sockets.
// Supports: LOGIN, SELECT, UID SEARCH, UID FETCH (headers + body), LOGOUT.
// Handles literal blocks ({N}) and continuation lines.
//
// Not a full IMAP implementation — just what we need to pull recent INBOX messages.

export type ConnectFn = (
  opts: { hostname: string; port: number },
  init?: { secureTransport?: "on" | "off" },
) => Socket;

// Lazy-loaded at runtime so Vite/Node SSR doesn't choke on the Worker-only module.
export async function getConnect(): Promise<ConnectFn> {
  const moduleName = `cloudflare:${"sockets"}`;
  try {
    const mod = await import(/* @vite-ignore */ moduleName);
    const connect = (mod as { connect?: ConnectFn }).connect;
    if (typeof connect === "function") return connect;
  } catch (error) {
    if (!isMissingCloudflareSocketsError(error)) throw error;
  }

  return createNodeConnect();
}

function isMissingCloudflareSocketsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("cloudflare:sockets") && message.includes("Cannot find module");
}

async function createNodeConnect(): Promise<ConnectFn> {
  const netModuleName = `node:${"net"}`;
  const tlsModuleName = `node:${"tls"}`;
  const streamModuleName = `node:${"stream"}`;
  const [netModule, tlsModule, streamModule] = await Promise.all([
    import(/* @vite-ignore */ netModuleName),
    import(/* @vite-ignore */ tlsModuleName),
    import(/* @vite-ignore */ streamModuleName),
  ]);

  type NodeSocket = {
    destroyed?: boolean;
    once(event: string, listener: (...args: unknown[]) => void): unknown;
    end(callback?: () => void): unknown;
    destroy(error?: Error): unknown;
  };

  const toWebReadable = (
    streamModule as { Readable: { toWeb(stream: unknown): ReadableStream<Uint8Array> } }
  ).Readable.toWeb;
  const toWebWritable = (
    streamModule as { Writable: { toWeb(stream: unknown): WritableStream<Uint8Array> } }
  ).Writable.toWeb;
  const netConnect = (netModule as { connect(options: { host: string; port: number }): NodeSocket })
    .connect;
  const tlsConnect = (
    tlsModule as {
      connect(options: { host: string; port: number; servername: string }): NodeSocket;
    }
  ).connect;

  return (opts, init) => {
    const nodeSocket =
      init?.secureTransport === "on"
        ? tlsConnect({ host: opts.hostname, port: opts.port, servername: opts.hostname })
        : netConnect({ host: opts.hostname, port: opts.port });

    return {
      readable: toWebReadable(nodeSocket),
      writable: toWebWritable(nodeSocket),
      close: () => closeNodeSocket(nodeSocket),
    };
  };
}

function closeNodeSocket(socket: {
  destroyed?: boolean;
  once(event: string, listener: () => void): unknown;
  end(callback?: () => void): unknown;
  destroy(): unknown;
}): Promise<void> {
  return new Promise((resolve) => {
    if (socket.destroyed) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    socket.once("close", finish);
    try {
      socket.end(finish);
    } catch {
      try {
        socket.destroy();
      } catch {}
      finish();
    }
  });
}

export type Socket = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  close(): Promise<void>;
};

export type ImapOptions = {
  host: string;
  port: number;
  secure: boolean; // true = TLS on connect (port 993); false = plain (rare)
  username: string;
  password: string;
};

export type ImapMessage = {
  uid: number;
  headers: Record<string, string>;
  body: string;
  rawHeaders: string;
  size: number;
};

export class ImapError extends Error {}

export class ImapClient {
  private socket: Socket | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buf = new Uint8Array(0);
  private tagCounter = 0;
  private enc = new TextEncoder();
  private dec = new TextDecoder("utf-8");

  constructor(private opts: ImapOptions) {}

  async connect(): Promise<void> {
    const connect = await getConnect();
    const sock = connect(
      { hostname: this.opts.host, port: this.opts.port },
      { secureTransport: this.opts.secure ? "on" : "off" },
    );
    this.socket = sock;
    this.writer = sock.writable.getWriter();
    this.reader = sock.readable.getReader();

    // Greeting
    const greet = await this.readLine();
    if (!greet.startsWith("* OK")) {
      throw new ImapError(`Unexpected greeting: ${greet}`);
    }
  }

  async login(): Promise<void> {
    const u = this.opts.username.replace(/"/g, '\\"');
    const p = this.opts.password.replace(/"/g, '\\"');
    const { ok, info } = await this.command(`LOGIN "${u}" "${p}"`);
    if (!ok) throw new ImapError(`LOGIN failed: ${info}`);
  }

  /** Returns total message count in INBOX. */
  async selectInbox(): Promise<number> {
    const { ok, info, untagged } = await this.command(`SELECT INBOX`);
    if (!ok) throw new ImapError(`SELECT INBOX failed: ${info}`);
    let exists = 0;
    for (const line of untagged) {
      const m = line.match(/^\* (\d+) EXISTS/);
      if (m) exists = parseInt(m[1], 10);
    }
    return exists;
  }

  /** Returns all UIDs sorted ascending. */
  async searchAllUids(): Promise<number[]> {
    const { ok, info, untagged } = await this.command(`UID SEARCH ALL`);
    if (!ok) throw new ImapError(`UID SEARCH failed: ${info}`);
    const uids: number[] = [];
    for (const line of untagged) {
      const m = line.match(/^\* SEARCH(.*)$/);
      if (m) {
        for (const s of m[1].trim().split(/\s+/)) {
          if (!s) continue;
          const n = parseInt(s, 10);
          if (Number.isFinite(n)) uids.push(n);
        }
      }
    }
    return uids.sort((a, b) => a - b);
  }

  /** Fetch a single message by UID. Returns null if not found. */
  async fetchMessage(uid: number): Promise<ImapMessage | null> {
    const tag = this.nextTag();
    const cmd = `${tag} UID FETCH ${uid} (UID RFC822.SIZE BODY.PEEK[HEADER] BODY.PEEK[TEXT])\r\n`;
    await this.write(cmd);

    let realUid: number | null = null;
    let size = 0;
    let header = "";
    let body = "";

    while (true) {
      const line = await this.readLine();
      if (line.startsWith(`${tag} `)) {
        const rest = line.slice(tag.length + 1);
        const status = rest.split(" ", 1)[0];
        if (status !== "OK") {
          throw new ImapError(`FETCH ${uid} failed: ${rest}`);
        }
        break;
      }
      if (!line.startsWith("*")) continue;

      // Try to capture UID and SIZE inline
      const uidM = line.match(/UID (\d+)/);
      if (uidM) realUid = parseInt(uidM[1], 10);
      const sizeM = line.match(/RFC822\.SIZE (\d+)/);
      if (sizeM) size = parseInt(sizeM[1], 10);

      // Look for literal markers in this line
      // Could be multiple in same line e.g. ... BODY[HEADER] {500}
      let cursor = 0;
      while (true) {
        const litIdx = line.indexOf("{", cursor);
        if (litIdx === -1) break;
        const endIdx = line.indexOf("}", litIdx);
        if (endIdx === -1) break;
        const n = parseInt(line.slice(litIdx + 1, endIdx), 10);
        if (!Number.isFinite(n)) break;
        // Identify which section precedes the literal
        const before = line.slice(0, litIdx);
        const data = await this.readBytes(n);
        const text = this.dec.decode(data);
        if (/BODY\[HEADER\]/i.test(before)) header = text;
        else if (/BODY\[TEXT\]/i.test(before)) body = text;
        // After literal, server sends trailing chars + CRLF on same logical line.
        // readLine() next iteration will consume it.
        cursor = endIdx + 1;
      }
    }

    if (!header && !body) return null;
    return {
      uid: realUid ?? uid,
      size,
      rawHeaders: header,
      headers: parseHeaders(header),
      body,
    };
  }

  /** Search messages by header name/value. Returns matching UIDs. */
  async uidSearchByHeader(headerName: string, value: string): Promise<number[]> {
    const escapedName = headerName.replace(/"/g, '\\"');
    const escapedVal = value.replace(/"/g, '\\"');
    const { ok, info, untagged } = await this.command(
      `UID SEARCH HEADER "${escapedName}" "${escapedVal}"`,
    );
    if (!ok) throw new ImapError(`UID SEARCH HEADER failed: ${info}`);
    const uids: number[] = [];
    for (const line of untagged) {
      const m = line.match(/^\* SEARCH(.*)$/);
      if (m) {
        for (const s of m[1].trim().split(/\s+/)) {
          if (!s) continue;
          const n = parseInt(s, 10);
          if (Number.isFinite(n)) uids.push(n);
        }
      }
    }
    return uids;
  }

  /** Mark a message as read by adding the \Seen flag. */
  async uidMarkSeen(uid: number): Promise<void> {
    await this.command(`UID STORE ${uid} +FLAGS (\\Seen)`);
  }

  /**
   * Move a UID to a target mailbox.
   * Tries RFC 6851 UID MOVE first; falls back to UID COPY + UID STORE \Deleted + EXPUNGE.
   */
  async uidMove(uid: number, targetMailbox: string): Promise<void> {
    const quoted = `"${targetMailbox.replace(/"/g, '\\"')}"`;
    const moveRes = await this.command(`UID MOVE ${uid} ${quoted}`);
    if (moveRes.ok) return;
    // Fallback: copy to target, then delete from source
    const copyRes = await this.command(`UID COPY ${uid} ${quoted}`);
    if (!copyRes.ok) throw new ImapError(`UID COPY to ${targetMailbox} failed: ${copyRes.info}`);
    await this.command(`UID STORE ${uid} +FLAGS (\\Deleted)`);
    await this.command(`EXPUNGE`);
  }

  async logout(): Promise<void> {
    try {
      await this.command(`LOGOUT`);
    } catch {
      // ignore
    }
  }

  async close(): Promise<void> {
    try {
      this.writer?.releaseLock();
    } catch {}
    try {
      this.reader?.releaseLock();
    } catch {}
    try {
      await this.socket?.close();
    } catch {}
    this.socket = null;
    this.writer = null;
    this.reader = null;
  }

  // ---------- internals ----------

  private nextTag(): string {
    this.tagCounter += 1;
    return `A${String(this.tagCounter).padStart(4, "0")}`;
  }

  private async write(s: string): Promise<void> {
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
        const status = rest.split(" ", 1)[0];
        return { ok: status === "OK", info: rest, untagged };
      }
      // Handle inline literals on untagged lines (rare here, but safe)
      let extended = line;
      const lit = line.match(/\{(\d+)\}$/);
      if (lit) {
        const n = parseInt(lit[1], 10);
        const data = await this.readBytes(n);
        extended = line + this.dec.decode(data);
        // continuation up to CRLF on its own
        const tail = await this.readLine();
        if (tail) extended += " " + tail;
      }
      untagged.push(extended);
    }
  }

  private async readLine(): Promise<string> {
    while (true) {
      // Look for CRLF in buffer
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
    while (this.buf.length < n) {
      await this.pull();
    }
    const out = this.buf.slice(0, n);
    this.buf = this.buf.slice(n);
    return out;
  }

  private async pull(): Promise<void> {
    if (!this.reader) throw new ImapError("not connected");
    const { value, done } = await this.reader.read();
    if (done || !value) throw new ImapError("Connection closed by server");
    const merged = new Uint8Array(this.buf.length + value.length);
    merged.set(this.buf, 0);
    merged.set(value, this.buf.length);
    this.buf = merged;
  }
}

// ---------- header / body parsing ----------

function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Unfold continuation lines (RFC 5322): a line starting with space/tab continues previous
  const lines = raw.split(/\r?\n/);
  const folded: string[] = [];
  for (const l of lines) {
    if (!l) continue;
    if (/^[\t ]/.test(l) && folded.length) {
      folded[folded.length - 1] += " " + l.trim();
    } else {
      folded.push(l);
    }
  }
  for (const l of folded) {
    const idx = l.indexOf(":");
    if (idx < 0) continue;
    const k = l.slice(0, idx).trim().toLowerCase();
    const v = l.slice(idx + 1).trim();
    out[k] = decodeMime(v);
  }
  return out;
}

// Decode RFC 2047 encoded-words (=?UTF-8?B?...?= and =?UTF-8?Q?...?=)
function decodeMime(s: string): string {
  return s.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_m: string, charset: string, enc: string, data: string) => {
      try {
        if (enc.toUpperCase() === "B") {
          const bin = atob(data);
          const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
          return new TextDecoder(charset.toLowerCase()).decode(bytes);
        } else {
          // Q encoding: _=space, =XX hex
          let out = data.replace(/_/g, " ");
          out = out.replace(/=([0-9A-Fa-f]{2})/g, (_x: string, hex: string) =>
            String.fromCharCode(parseInt(hex, 16)),
          );
          // Treat as UTF-8 bytes if charset says so
          if (/utf-?8/i.test(charset)) {
            const bytes = Uint8Array.from(out, (c) => c.charCodeAt(0));
            return new TextDecoder("utf-8").decode(bytes);
          }
          return out;
        }
      } catch {
        return data;
      }
    },
  );
}

export function parseFromAddress(from: string | undefined): { name: string | null; email: string } {
  if (!from) return { name: null, email: "" };
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: from.trim().toLowerCase() };
}

/**
 * Extract a best-effort plain text body from a fetched RFC822 TEXT part,
 * given the headers (for Content-Type / Content-Transfer-Encoding / boundary).
 */
export function extractBody(headers: Record<string, string>, body: string): string {
  const { text } = extractBodyParts(headers, body);
  return text;
}

export function extractBodyParts(
  headers: Record<string, string>,
  body: string,
): { text: string; html: string | null } {
  const ct = headers["content-type"] ?? "text/plain";
  const cte = (headers["content-transfer-encoding"] ?? "7bit").toLowerCase();
  const result = extractFromPart(ct, cte, body);
  const text = result.plain ? result.plain.trim() : result.html ? stripHtml(result.html) : "";
  return { text, html: result.html ? result.html.trim() : null };
}

function extractFromPart(
  ct: string,
  cte: string,
  content: string,
): { plain: string | null; html: string | null } {
  const boundaryM = ct.match(/boundary="?([^";]+)"?/i);
  if (boundaryM) {
    const boundary = boundaryM[1];
    const parts = content.split(new RegExp(`--${escapeRegex(boundary)}(?:--)?\\r?\\n?`));
    let plain: string | null = null;
    let html: string | null = null;
    for (const part of parts) {
      const sepIdx = part.search(/\r?\n\r?\n/);
      if (sepIdx < 0) continue;
      const hdrRaw = part.slice(0, sepIdx);
      const inner = part.slice(sepIdx).replace(/^\r?\n\r?\n/, "");
      const hdrs = parseHeaders(hdrRaw);
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
  let text = data;
  if (cte === "base64") {
    try {
      const cleaned = data.replace(/\s+/g, "");
      const bin = atob(cleaned);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const charsetM = ct.match(/charset="?([^";]+)"?/i);
      const charset = charsetM ? charsetM[1] : "utf-8";
      text = new TextDecoder(charset.toLowerCase()).decode(bytes);
    } catch {
      // leave as-is
    }
  } else if (cte === "quoted-printable") {
    text = data
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
    // Treat as UTF-8 bytes
    try {
      const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
      text = new TextDecoder("utf-8").decode(bytes);
    } catch {}
  }
  return text;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
