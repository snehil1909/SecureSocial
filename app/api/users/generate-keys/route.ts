import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateUserKeyPair, encryptPrivateKey } from "@/lib/crypto/keys"

export async function POST(req: Request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        email: true,
        publicKey: true,
        encryptedPrivateKey: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate a new key pair
    const { publicKey, privateKey } = generateUserKeyPair()
    
    // Log key details for debugging
    // console.log(`[KeyGen ${new Date().toISOString()}] User ${user.id}: Generating new keys`);
    // console.log(`[KeyGen] Old public key: ${user.publicKey ? user.publicKey.substring(0, 40) + '...' : 'none'}`);
    // console.log(`[KeyGen] New public key: ${publicKey.substring(0, 40)}...`);
    
    // Add timestamp to track when keys were last generated
    const keyTimestamp = new Date().toISOString();

    // Add a version identifier to help with synchronization
    const keyVersion = Date.now().toString();
    
    // Include the key version in the privateKey before encryption
    const versionedPrivateKey = `${privateKey}\n// Version: ${keyVersion}`;

    // Encrypt the private key with the user's email as password
    const password = user.email || "default-password"
    const encryptedPrivateKey = encryptPrivateKey(versionedPrivateKey, password)

    // Update the user with the new keys
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        publicKey,
        encryptedPrivateKey,
        updatedAt: new Date(), // Ensure updatedAt is refreshed
      },
    })

    return NextResponse.json({
      message: "Encryption keys generated successfully",
      hasKeys: true,
      timestamp: keyTimestamp,
    })
  } catch (error) {
    console.error("Error generating encryption keys:", error)
    return NextResponse.json(
      { error: "Failed to generate encryption keys" },
      { status: 500 }
    )
  }
} 