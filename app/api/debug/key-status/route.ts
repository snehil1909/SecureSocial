import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { decryptPrivateKey } from "@/lib/crypto/keys"

export async function GET(req: Request) {
  try {
    // Check if we're in development mode
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development mode" },
        { status: 403 }
      )
    }
    
    // Get the current session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user with current keys
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        email: true,
        publicKey: true,
        encryptedPrivateKey: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const hasKeys = !!(user.publicKey && user.encryptedPrivateKey);
    
    // Track key changes without relying on security logs
    const keyChanges = [{
      date: user.updatedAt,
      event: "Last key update (from user record)",
      keyFingerprint: user.publicKey ? calculateFingerprint(user.publicKey) : "none" 
    }];
    
    // Try to decrypt the private key as a validation test
    let keyValidation = { success: false, error: "" };
    if (hasKeys && user.encryptedPrivateKey) {
      try {
        const password = user.email || "default-password";
        const privateKey = decryptPrivateKey(user.encryptedPrivateKey, password);
        
        // Check if the key has the expected format
        keyValidation = {
          success: privateKey.includes("PRIVATE KEY"),
          error: "",
        };
      } catch (error: any) {
        keyValidation = {
          success: false,
          error: error.message || "Failed to decrypt private key",
        };
      }
    }
    
    // Calculate key fingerprints for comparison
    const publicKeyFingerprint = user.publicKey 
      ? calculateFingerprint(user.publicKey) 
      : "";
    
    // Get all conversations to check session keys
    const conversations = await db.conversationUser.findMany({
      where: {
        userId: user.id,
      },
      select: {
        conversationId: true,
        encryptedSessionKey: true,
      },
    });
    
    return NextResponse.json({
      userId: user.id,
      hasKeys: hasKeys,
      keyDetails: {
        publicKeyLength: user.publicKey?.length || 0,
        publicKeyFingerprint: publicKeyFingerprint,
        publicKeyPrefix: user.publicKey ? user.publicKey.substring(0, 50) + "..." : "",
        privateKeyEncrypted: !!user.encryptedPrivateKey,
        privateKeyLength: user.encryptedPrivateKey?.length || 0,
        lastUpdated: user.updatedAt,
        keyValidation,
      },
      sessionKeys: conversations.map(c => ({
        conversationId: c.conversationId,
        hasSessionKey: !!c.encryptedSessionKey,
        sessionKeyLength: c.encryptedSessionKey?.length || 0,
      })),
      keyHistory: keyChanges,
    })
  } catch (error) {
    console.error("Error checking key status:", error)
    return NextResponse.json(
      { error: "Failed to check key status" },
      { status: 500 }
    )
  }
}

// Helper function to calculate a key fingerprint for comparison
function calculateFingerprint(key: string): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(key);
  return hash.digest('hex').substring(0, 16);
} 