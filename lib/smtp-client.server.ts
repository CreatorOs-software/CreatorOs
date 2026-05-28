// Minimal SMTP client (implicit TLS only, port 465 style).
// Supports: EHLO, AUTH LOGIN, MAIL FROM, RCPT TO, DATA, QUIT.
// Reuses the connect helper from imap-client.server so it works in both
// the Cloudflare Worker runtime and the local Node dev runtime.

import { getConnect, type Socket } from "./imap-client.server";

export type SmtpOptions = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

export type SmtpMessage = {
  from: { name?: string | null; email: string };
  to: string[];
  subject: string;
  text: string;
  inReplyTo?: string | null;
  references?: string | null;
};

export class SmtpError extends Error {}

export class SmtpClient {
  private socket: Socket | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buf = "";
  private enc = new TextEncoder();
  private dec = new TextDecoder("utf-8");

  constructor(private opts: SmtpOptions) {}

  async connect(): Promise<void> {
    if (!this.opts.secure) {
      throw new SmtpError("Only implicit TLS (port 465-style) is supported. Set SMTP secure=true.");
    }
    const connect = await getConnect();
    this.socket = connect(
      { hostname: this.opts.host, port: this.opts.port },
      { secureTransport: "on" },
    );
    this.writer = this.socket.writable.getWriter();
    this.reader = this.socket.readable.getReader();
    const greeting = await this.readResponse();
    if (!greeting.code.startsWith("2")) throw new SmtpError(`SMTP greeting failed: ${greeting.text}`);
  }

  async login(): Promise<void> {
    const ehlo = await this.cmd(`EHLO smtp.client.local`);
    if (!ehlo.code.startsWith("2")) throw new SmtpError(`EHLO failed: ${ehlo.text}`);

    const authResp = await this.cmd(`AUTH LOGIN`);
    if (!authResp.code.startsWith("3")) throw new SmtpError(`AUTH LOGIN failed: ${authResp.text}`);
    const userResp = await this.cmd(b64(this.opts.username));
    if (!userResp.code.startsWith("3")) throw new SmtpError(`AUTH user failed: ${userResp.text}`);
    const passResp = await this.cmd(b64(this.opts.password));
    if (!passResp.code.startsWith("2")) throw new SmtpError(`AUTH failed: ${passResp.text}`);
  }

  async send(msg: SmtpMessage): Promise<void> {
    const mf = await this.cmd(`MAIL FROM:<${msg.from.email}>`);
    if (!mf.code.startsWith("2")) throw new SmtpError(`MAIL FROM rejected: ${mf.text}`);
    for (const r of msg.to) {
      const rcpt = await this.cmd(`RCPT TO:<${r}>`);
      if (!rcpt.code.startsWith("2")) throw new SmtpError(`RCPT TO rejected: ${rcpt.text}`);
    }
    const d1 = await this.cmd(`DATA`);
    if (!d1.code.startsWith("3")) throw new SmtpError(`DATA rejected: ${d1.text}`);

    const fromHeader = msg.from.name
      ? `${encodeHeaderWord(msg.from.name)} <${msg.from.email}>`
      : `<${msg.from.email}>`;
    const now = new Date().toUTCString();
    const messageId = `<${randomId()}@${msg.from.email.split("@")[1] || "local"}>`;

    const headers: string[] = [
      `From: ${fromHeader}`,
      `To: ${msg.to.join(", ")}`,
      `Subject: ${encodeHeaderWord(msg.subject)}`,
      `Date: ${now}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
    ];
    if (msg.inReplyTo) headers.push(`In-Reply-To: ${msg.inReplyTo}`);
    if (msg.references) headers.push(`References: ${msg.references}`);

    const dotStuffed = msg.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
    const payload = headers.join("\r\n") + "\r\n\r\n" + dotStuffed + "\r\n.\r\n";
    await this.writeRaw(payload);
    const ok = await this.readResponse();
    if (!ok.code.startsWith("2")) throw new SmtpError(`Message rejected: ${ok.text}`);
  }

  async quit(): Promise<void> {
    try { await this.cmd("QUIT"); } catch {}
  }

  async close(): Promise<void> {
    try { this.reader?.releaseLock(); } catch {}
    try { this.writer?.releaseLock(); } catch {}
    if (this.socket) await this.socket.close();
    this.socket = null;
    this.reader = null;
    this.writer = null;
  }

  private async cmd(line: string): Promise<{ code: string; text: string }> {
    await this.writeRaw(line + "\r\n");
    return this.readResponse();
  }

  private async writeRaw(s: string): Promise<void> {
    if (!this.writer) throw new SmtpError("Not connected");
    await this.writer.write(this.enc.encode(s));
  }

  private async readResponse(): Promise<{ code: string; text: string }> {
    // Multi-line: "250-foo\r\n250 bar\r\n" — last line uses space after code.
    const lines: string[] = [];
    let code = "";
    for (;;) {
      const line = await this.readLine();
      lines.push(line);
      if (line.length < 4) throw new SmtpError(`Bad SMTP response: ${line}`);
      code = line.slice(0, 3);
      const sep = line[3];
      if (sep === " " || sep === undefined) break;
      // sep === "-" → continuation
    }
    return { code, text: lines.join("\n") };
  }

  private async readLine(): Promise<string> {
    if (!this.reader) throw new SmtpError("Not connected");
    while (true) {
      const idx = this.buf.indexOf("\r\n");
      if (idx >= 0) {
        const line = this.buf.slice(0, idx);
        this.buf = this.buf.slice(idx + 2);
        return line;
      }
      const { value, done } = await this.reader.read();
      if (done) {
        if (this.buf.length === 0) throw new SmtpError("SMTP connection closed");
        const rest = this.buf; this.buf = "";
        return rest;
      }
      this.buf += this.dec.decode(value, { stream: true });
    }
  }
}

function b64(s: string): string {
  // Encode UTF-8 → base64
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function encodeHeaderWord(s: string): string {
  // RFC 2047 only if non-ASCII
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  return `=?UTF-8?B?${b64(s)}?=`;
}

function randomId(): string {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}
