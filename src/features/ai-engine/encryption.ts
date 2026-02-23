import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"

function getEncryptionKey(): Buffer {
  const key = process.env.API_KEY_ENCRYPTION_SECRET
  if (!key || key.length !== 64) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes). " +
        "Generate with: openssl rand -hex 32"
    )
  }
  return Buffer.from(key, "hex")
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

export function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":")

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted data format")
  }

  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "***"
  }
  const prefix = apiKey.slice(0, 3)
  const suffix = apiKey.slice(-3)
  return `${prefix}***...***${suffix}`
}
