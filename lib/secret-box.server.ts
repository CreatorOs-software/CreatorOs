// Server-only AES-256-GCM encryption for provider secrets (access tokens,
// app secrets) at rest. The key is managed separately from the database
// (WHATSAPP_TOKEN_ENCRYPTION_KEY) so a DB dump alone never exposes tokens.
//
// Stored format: "<iv_b64>.<tag_b64>.<ciphertext_b64>" — a single TEXT column.

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY ist nicht gesetzt — Provider-Secrets können nicht verschlüsselt werden.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "WHATSAPP_TOKEN_ENCRYPTION_KEY muss 32 Bytes (base64-kodiert) sein, z. B. per `openssl rand -base64 32`.",
    );
  }
  cachedKey = key;
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(box: string): string {
  const parts = box.split(".");
  if (parts.length !== 3) throw new Error("Ungültiges Secret-Format.");
  const [ivB64, tagB64, ciphertextB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
