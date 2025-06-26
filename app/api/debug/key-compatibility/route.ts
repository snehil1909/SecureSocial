import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateUserKeyPair, encryptPrivateKey, decryptPrivateKey } from "@/lib/crypto/keys"
import { encryptSessionKey, decryptSessionKey, generateSessionKey } from "@/lib/crypto/message-chain"
import crypto from "crypto"

// Define interface for test results
interface KeyTestResult {
  test: string;
  originalLength?: number;
  decryptedLength?: number;
  match?: boolean;
  error?: string;
  signatureTest?: string;
}

interface DiagnosticResults {
  existingKeys: KeyTestResult & { 
    hasKeys: boolean;
  };
  newKeys: KeyTestResult;
}

// Debug utility to test key compatibility
export async function GET(req: Request) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user for testing
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        publicKey: true,
        encryptedPrivateKey: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const results: DiagnosticResults = {
      existingKeys: { hasKeys: false, test: "not run" },
      newKeys: { test: "not run" }
    };

    // 1. Test with existing keys if available
    if (user.publicKey && user.encryptedPrivateKey) {
      results.existingKeys.hasKeys = true;
      
      try {
        // Decrypt the existing private key
        const password = user.email || "default-password";
        const privateKey = decryptPrivateKey(user.encryptedPrivateKey, password);
        
        // Test encryption and decryption with session key
        const sessionKey = generateSessionKey();
        const encryptedSessionKey = encryptSessionKey(sessionKey, user.publicKey);
        const decryptedSessionKey = decryptSessionKey(encryptedSessionKey, privateKey);
        
        const success = sessionKey === decryptedSessionKey;
        results.existingKeys.test = success ? "passed" : "failed";
        results.existingKeys.originalLength = sessionKey.length;
        results.existingKeys.decryptedLength = decryptedSessionKey.length;
        results.existingKeys.match = sessionKey === decryptedSessionKey;
      } catch (error: any) {
        results.existingKeys.test = "error";
        results.existingKeys.error = error.message;
      }
    }

    // 2. Test with fresh keys
    try {
      // Generate new key pair
      const { publicKey, privateKey } = generateUserKeyPair();
      
      // Test encryption and decryption with session key
      const sessionKey = generateSessionKey();
      const encryptedSessionKey = encryptSessionKey(sessionKey, publicKey);
      const decryptedSessionKey = decryptSessionKey(encryptedSessionKey, privateKey);
      
      const success = sessionKey === decryptedSessionKey;
      results.newKeys.test = success ? "passed" : "failed";
      results.newKeys.originalLength = sessionKey.length;
      results.newKeys.decryptedLength = decryptedSessionKey.length;
      results.newKeys.match = sessionKey === decryptedSessionKey;

      // Try a different method for verification
      const testData = "This is a test message";
      
      // RSA verification test
      const sign = crypto.createSign("SHA256");
      sign.update(testData);
      const signature = sign.sign(privateKey, "base64");
      
      const verify = crypto.createVerify("SHA256");
      verify.update(testData);
      const verified = verify.verify(publicKey, signature, "base64");
      
      results.newKeys.signatureTest = verified ? "passed" : "failed";
    } catch (error: any) {
      results.newKeys.test = "error";
      results.newKeys.error = error.message;
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Debug key compatibility error:", error);
    return NextResponse.json(
      { error: "Debug failed", message: error.message },
      { status: 500 }
    );
  }
} 