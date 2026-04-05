import { createCipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PAYLOAD_VERSION = "v1";

function getEncryptionKey(): Buffer {
  const rawKey = process.env.PROVIDER_KEY_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error(
      "Missing PROVIDER_KEY_ENCRYPTION_KEY environment variable.",
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(rawKey, "base64");
  } catch {
    throw new Error("PROVIDER_KEY_ENCRYPTION_KEY must be valid base64.");
  }

  if (key.length !== 32) {
    throw new Error(
      "PROVIDER_KEY_ENCRYPTION_KEY must decode to 32 bytes (AES-256 key).",
    );
  }

  return key;
}

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Encryption must only run on the server.");
  }
}

/**
 * Encrypts a provider API key with AES-256-GCM.
 * Returns a versioned payload: v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>
 */
export function encryptProviderKey(plaintextKey: string): string {
  assertServerOnly();

  const normalized = plaintextKey.trim();
  if (!normalized) {
    throw new Error("Provider key cannot be empty.");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  try {
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const ciphertext = Buffer.concat([
      cipher.update(normalized, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      PAYLOAD_VERSION,
      iv.toString("base64url"),
      authTag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(":");
  } catch {
    throw new Error("Failed to encrypt provider key.");
  }
}
