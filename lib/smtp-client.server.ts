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
  cc?: string[];
  bcc?: string[];
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
    // Port 587 is always STARTTLS; port 465 is always implicit TLS.
    // Respect the stored secure flag otherwise, but override for well-known ports
    // so existing integrations saved with the wrong setting still work.
    const useImplicitTLS = this.opts.port === 465 || (this.opts.secure && this.opts.port !== 587);
    if (useImplicitTLS) {
      // Implicit TLS (port 465)
      const connect = await getConnect();
      this.socket = connect(
        { hostname: this.opts.host, port: this.opts.port },
        { secureTransport: "on" },
      );
      this.writer = this.socket.writable.getWriter();
      this.reader = this.socket.readable.getReader();
      const greeting = await this.readResponse();
      if (!greeting.code.startsWith("2")) throw new SmtpError(`SMTP greeting failed: ${greeting.text}`);
    } else {
      // STARTTLS (port 587 or explicit secure: false)
      await this.connectStartTLS();
    }
  }

  // STARTTLS: plain connect → greeting → EHLO → STARTTLS → TLS upgrade
  private async connectStartTLS(): Promise<void> {
    // Try Cloudflare Workers socket (supports secureTransport "starttls")
    const cfModule = `cloudflare:${"sockets"}`;
    try {
      const mod = await import(/* @vite-ignore */ cfModule);
      const cfConnect = (mod as { connect?: (opts: { hostname: string; port: number }, init?: { secureTransport?: string }) => Socket & { startTls(): Socket } }).connect;
      if (typeof cfConnect === "function") {
        const cfSocket = cfConnect(
          { hostname: this.opts.host, port: this.opts.port },
          { secureTransport: "starttls" },
        );
        this.socket = cfSocket;
        this.writer = this.socket.writable.getWriter();
        this.reader = this.socket.readable.getReader();

        const greeting = await this.readResponse();
        if (!greeting.code.startsWith("2")) throw new SmtpError(`SMTP greeting failed: ${greeting.text}`);

        const ehlo = await this.cmd(`EHLO smtp.client.local`);
        if (!ehlo.code.startsWith("2")) throw new SmtpError(`EHLO failed: ${ehlo.text}`);

        const st = await this.cmd(`STARTTLS`);
        if (!st.code.startsWith("2")) throw new SmtpError(`STARTTLS rejected: ${st.text}`);

        this.reader.releaseLock();
        this.writer.releaseLock();
        const tlsSocket = cfSocket.startTls();
        this.socket = tlsSocket;
        this.buf = "";
        this.writer = this.socket.writable.getWriter();
        this.reader = this.socket.readable.getReader();
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("cloudflare:sockets")) throw e;
    }

    // Node.js STARTTLS implementation
    const netMod  = await import(/* @vite-ignore */ `node:${"net"}`);
    const tlsMod  = await import(/* @vite-ignore */ `node:${"tls"}`);
    const streamMod = await import(/* @vite-ignore */ `node:${"stream"}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type NodeDuplex = { destroyed?: boolean; once(e: string, fn: (...a: any[]) => void): unknown; end(cb?: () => void): unknown; destroy(e?: Error): unknown; on(e: string, fn: (...a: any[]) => void): unknown; off(e: string, fn: (...a: any[]) => void): unknown; write(d: string, cb?: (err: Error | null | undefined) => void): void };

    const net = netMod as { connect(o: { host: string; port: number }): NodeDuplex };
    const tls = tlsMod as { connect(o: { socket: NodeDuplex; servername: string }): NodeDuplex & { authorized?: boolean } };
    const { Readable, Writable } = streamMod as { Readable: { toWeb(s: unknown): ReadableStream<Uint8Array> }; Writable: { toWeb(s: unknown): WritableStream<Uint8Array> } };

    const netSocket = net.connect({ host: this.opts.host, port: this.opts.port });
    await new Promise<void>((res, rej) => { netSocket.once("connect", res); netSocket.once("error", rej); });

    // Line-buffered reader for the pre-TLS exchange
    let plainBuf = "";
    const onPlainData = (chunk: unknown) => { plainBuf += (chunk as Buffer).toString("utf-8"); };
    netSocket.on("data", onPlainData);

    const readPlainLine = (): Promise<string> => new Promise((res, rej) => {
      const check = () => {
        const idx = plainBuf.indexOf("\r\n");
        if (idx < 0) return false;
        const line = plainBuf.slice(0, idx);
        plainBuf = plainBuf.slice(idx + 2);
        res(line);
        return true;
      };
      if (check()) return;
      const poll = () => {
        if (check()) return;
        // Re-listen for next chunk
        netSocket.once("data", poll);
      };
      netSocket.once("error", rej);
      poll();
    });

    const readPlainResponse = async (): Promise<{ code: string; text: string }> => {
      const lines: string[] = [];
      let code = "";
      for (;;) {
        const line = await readPlainLine();
        lines.push(line);
        if (line.length < 4) throw new SmtpError(`Bad SMTP response: ${line}`);
        code = line.slice(0, 3);
        if (line[3] === " " || line[3] === undefined) break;
      }
      return { code, text: lines.join("\n") };
    };

    const writePlain = (s: string): Promise<void> => new Promise((res, rej) => { netSocket.write(s, (err) => err ? rej(err) : res()); });

    // Greeting
    const greeting = await readPlainResponse();
    if (!greeting.code.startsWith("2")) throw new SmtpError(`SMTP greeting failed: ${greeting.text}`);

    // EHLO
    await writePlain(`EHLO smtp.client.local\r\n`);
    const ehlo = await readPlainResponse();
    if (!ehlo.code.startsWith("2")) throw new SmtpError(`EHLO failed: ${ehlo.text}`);

    // STARTTLS
    await writePlain(`STARTTLS\r\n`);
    const st = await readPlainResponse();
    if (!st.code.startsWith("2")) throw new SmtpError(`STARTTLS rejected: ${st.text}`);

    // Upgrade to TLS — remove the plain data accumulator first to avoid a listener leak
    netSocket.off("data", onPlainData);
    const tlsSocket = tls.connect({ socket: netSocket, servername: this.opts.host });
    await new Promise<void>((res, rej) => { tlsSocket.once("secureConnect", res); tlsSocket.once("error", rej); });

    this.socket = {
      readable: Readable.toWeb(tlsSocket),
      writable: Writable.toWeb(tlsSocket),
      close: () => new Promise<void>((res) => {
        const cleanup = () => {
          if (!netSocket.destroyed) { try { netSocket.destroy(); } catch {} }
          res();
        };
        if (tlsSocket.destroyed) { cleanup(); return; }
        tlsSocket.once("close", cleanup);
        try { tlsSocket.end(); } catch { try { tlsSocket.destroy(); } catch {} cleanup(); }
      }),
    };
    this.writer = this.socket.writable.getWriter();
    this.reader = this.socket.readable.getReader();
    // greeting already consumed; login() will re-send EHLO over TLS which is required by RFC
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

  async send(msg: SmtpMessage): Promise<{ messageId: string }> {
    const mf = await this.cmd(`MAIL FROM:<${msg.from.email}>`);
    if (!mf.code.startsWith("2")) throw new SmtpError(`MAIL FROM rejected: ${mf.text}`);
    for (const r of [...msg.to, ...(msg.cc ?? []), ...(msg.bcc ?? [])]) {
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
      ...(msg.cc?.length ? [`Cc: ${msg.cc.join(", ")}`] : []),
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
    return { messageId };
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
