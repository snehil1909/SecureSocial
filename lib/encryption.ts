import crypto from "crypto"

// Add this helper function
export function getEncryptionKey(): string {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY
  if (!key) {
    console.error("Encryption key not found")
    // Log where this is being called from to help debugging
    console.trace("Key missing at:")
    return "fallback-key-for-development" // Only for development
  }
  return key
}

// Simple encryption/decryption functions
export function encryptMessage(message: string, secretKey?: string): string {
  try {
    // Empty message check
    if (!message) {
      return "" // Return empty string for empty messages
    }

    // Use provided key or fallback to environment variable
    const key = secretKey || getEncryptionKey()

    // Validate key exists
    if (!key) {
      throw new Error("Encryption key is not available")
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key.padEnd(32).slice(0, 32)), iv)

    const encrypted = Buffer.concat([cipher.update(message, "utf8"), cipher.final()])

    const authTag = cipher.getAuthTag()

    return Buffer.concat([iv, encrypted, authTag]).toString("base64")
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error("Failed to encrypt message")
  }
}

export function decryptMessage(encryptedMessage: string, secretKey?: string): string {
  // Handle empty or null messages
  if (!encryptedMessage || encryptedMessage.trim() === "") {
    return ""
  }

  // Current key
  const primaryKey = secretKey || getEncryptionKey()

  // Legacy keys - add previous keys here if you changed them
  const legacyKeys = [
    process.env.LEGACY_ENCRYPTION_KEY_1,
    process.env.LEGACY_ENCRYPTION_KEY_2,
    // Add more as needed
  ].filter(Boolean) // Remove empty values

  // Try with primary key first
  try {
    if (!primaryKey) {
      throw new Error("Encryption key is not available")
    }

    // Basic format validation before processing
    if (!/^[A-Za-z0-9+/=]+$/.test(encryptedMessage)) {
      throw new Error("Message is not in valid base64 format")
    }

    const buf = Buffer.from(encryptedMessage, "base64")

    // Validate the message is long enough to contain IV + content + authTag
    if (buf.length < 32) {
      throw new Error("Encrypted message is too short or malformed")
    }

    // Extract the iv, encrypted data, and auth tag
    const iv = buf.subarray(0, 16)
    const authTag = buf.subarray(buf.length - 16)
    const encrypted = buf.subarray(16, buf.length - 16)

    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(primaryKey.padEnd(32).slice(0, 32)), iv)

    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    return decrypted.toString("utf8")
  } catch (primaryKeyError) {
    // Reduce log verbosity - only log if debug is enabled
    if (process.env.DEBUG_ENCRYPTION === "true") {
      console.error("Decryption failed with primary key:", {
        messageLength: encryptedMessage.length,
        firstBytes: encryptedMessage.substring(0, 20) + "...",
        error: primaryKeyError.message,
      })
    }

    // If primary key fails, try legacy keys
    for (const legacyKey of legacyKeys) {
      try {
        // Same logic as above but with legacy key
        // Basic format validation
        if (!/^[A-Za-z0-9+/=]+$/.test(encryptedMessage)) {
          throw new Error("Message is not in valid base64 format")
        }

        const buf = Buffer.from(encryptedMessage, "base64")

        if (buf.length < 32) {
          throw new Error("Encrypted message is too short or malformed")
        }

        const iv = buf.subarray(0, 16)
        const authTag = buf.subarray(buf.length - 16)
        const encrypted = buf.subarray(16, buf.length - 16)

        const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(legacyKey.padEnd(32).slice(0, 32)), iv)

        decipher.setAuthTag(authTag)

        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

        return decrypted.toString("utf8")
      } catch (legacyKeyError) {
        // Continue to next key if this one fails
        continue
      }
    }

    // If all keys fail, return a fallback message instead of throwing
    // Only log summary of error, not every instance
    if (process.env.DEBUG_ENCRYPTION === "true") {
      console.error("Decryption error summary:", primaryKeyError.message)
    }
    return "[Encrypted message]" // Return a placeholder instead of throwing error
  }
}

// Generate RSA key pair for PKI
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  })

  return { publicKey, privateKey }
}

// Sign data with private key
export function signData(data: string, privateKey: string): string {
  const sign = crypto.createSign("SHA256")
  sign.update(data)
  sign.end()
  return sign.sign(privateKey, "base64")
}

// Verify signature with public key
export function verifySignature(data: string, signature: string, publicKey: string): boolean {
  const verify = crypto.createVerify("SHA256")
  verify.update(data)
  verify.end()
  return verify.verify(publicKey, signature, "base64")
}

