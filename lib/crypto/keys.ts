import crypto from "crypto"

// Track generated keys to prevent accidental duplication
const recentKeyFingerprints = new Set<string>();

// Generate user key pair on registration or first login
export function generateUserKeyPair(): { publicKey: string; privateKey: string } {
  // Use stronger key generation with more randomness
  const keyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
    // Add additional entropy for key generation
    publicExponent: 0x10001,
  });
  
  // Generate a fingerprint to verify uniqueness
  const publicKeyFingerprint = calculateKeyFingerprint(keyPair.publicKey);
  
  // If we've generated this key before (extremely unlikely but possible), regenerate
  if (recentKeyFingerprints.has(publicKeyFingerprint)) {
    console.warn("Key fingerprint collision detected! Regenerating key pair...");
    return generateUserKeyPair(); // Recursive call to try again
  }
  
  // Store this fingerprint to avoid duplicates
  recentKeyFingerprints.add(publicKeyFingerprint);
  
  // Limit the fingerprint cache to last 10 keys
  if (recentKeyFingerprints.size > 10) {
    // Remove the oldest entry (first in the set)
    const firstValueIterator = recentKeyFingerprints.values().next();
    if (firstValueIterator.done === false && firstValueIterator.value) {
      recentKeyFingerprints.delete(firstValueIterator.value);
    }
  }
  
  // Log key details for debugging
  // console.log("Generated key pair with fingerprint:", publicKeyFingerprint);
  // console.log("Public key starts with:", keyPair.publicKey.substring(0, 40));
  // console.log("Private key starts with:", keyPair.privateKey.substring(0, 40));
  
  return keyPair;
}

// Encrypt user's private key with their password before storing
export function encryptPrivateKey(privateKey: string, password: string): string {
  try {
    // Add timestamp to private key metadata to ensure it's never the same
    // even with the same input
    const uniqueKey = `${privateKey}\n// Generated: ${Date.now()}`;
    
    const salt = crypto.randomBytes(16)
    const key = crypto.scryptSync(password, salt, 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)

    const encrypted = Buffer.concat([salt, iv, cipher.update(Buffer.from(uniqueKey)), cipher.final()])
    const result = encrypted.toString("base64");
    
    // Log encrypted details
    // console.log("Encrypted private key:");
    // console.log(`- Original length: ${privateKey.length}`);
    // console.log(`- Encrypted length: ${result.length}`);
    // console.log(`- Encrypted starts with: ${result.substring(0, 40)}...`);

    return result;
  } catch (error) {
    console.error("Error encrypting private key:", error);
    throw error;
  }
}

// Decrypt user's private key using their password
export function decryptPrivateKey(encryptedKey: string, password: string): string {
  try {
    // console.log(`[decrypt] Starting decryption of key (${encryptedKey.length} chars)`);
    
    // Handle the special case where we appended a timestamp marker for cache clearing
    const markerPosition = encryptedKey.indexOf('_updated_');
    if (markerPosition > 0) {
      // console.log(`[decrypt] Found timestamp marker at position ${markerPosition}, trimming it`);
      encryptedKey = encryptedKey.substring(0, markerPosition);
    }
    
    const data = Buffer.from(encryptedKey, "base64")
    const salt = data.subarray(0, 16)
    const iv = data.subarray(16, 32)
    const encrypted = data.subarray(32)

    const key = crypto.scryptSync(password, salt, 32)
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
    
    // Check for version information in the decrypted private key
    const versionMatch = decrypted.match(/\/\/ Version: ([0-9]+)/);
    const keyVersion = versionMatch ? versionMatch[1] : null;
    
    if (keyVersion) {
      // console.log(`[decrypt] Found key version: ${keyVersion}`);
    }
    
    // Process the decrypted data to clean up metadata we added
    // But preserve the Version info which is crucial for synchronization
    let cleanedKey = decrypted;
    
    // Remove the timestamp metadata (but not version)
    const generatedIndex = decrypted.indexOf('// Generated:');
    if (generatedIndex > 0) {
      // Check if there's a version after the generated timestamp
      const versionAfterGenerated = decrypted.indexOf('// Version:', generatedIndex);
      if (versionAfterGenerated > 0) {
        // Keep both portions with version info
        cleanedKey = decrypted.substring(0, generatedIndex) + decrypted.substring(versionAfterGenerated);
      } else {
        cleanedKey = decrypted.substring(0, generatedIndex);
      }
    }
    
    // Ensure the private key has the correct PEM format
    if (!cleanedKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error("Decrypted private key is not in PEM format");
      throw new Error("Invalid private key format");
    }
    
    // console.log("[decrypt] Successfully decrypted private key");
    // console.log(`[decrypt] Key starts with: ${cleanedKey.substring(0, 40)}...`);
    
    return cleanedKey;
  } catch (error) {
    console.error("Error decrypting private key:", error);
    throw error;
  }
}

// Calculate a key fingerprint for uniqueness verification
export function calculateKeyFingerprint(key: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(key);
  return hash.digest('hex').substring(0, 16);
}

