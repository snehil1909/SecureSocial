import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateUserKeyPair, encryptPrivateKey } from "@/lib/crypto/keys"

export async function GET(req: Request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if reset parameter is present
    const url = new URL(req.url);
    const resetKey = url.searchParams.get('reset') === 'true';

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

    // Check if user already has a key pair and we're not resetting
    if (user.publicKey && user.encryptedPrivateKey && !resetKey) {
      return NextResponse.json({
        message: "User already has encryption keys",
        hasKeys: true,
      })
    }

    // Generate a new key pair
    const { publicKey, privateKey } = generateUserKeyPair()
    
    // Log key details for debugging
    console.log(`[KeyGen ${new Date().toISOString()}] User ${user.id}: Generating new keys`);
    console.log(`[KeyGen] Old public key: ${user.publicKey ? user.publicKey.substring(0, 40) + '...' : 'none'}`);
    console.log(`[KeyGen] New public key: ${publicKey.substring(0, 40)}...`);
    
    // Add timestamp to track when keys were last generated
    const keyTimestamp = new Date().toISOString();

    // Add a version identifier to help with synchronization
    const keyVersion = Date.now().toString();
    
    // Include the key version in the privateKey before encryption
    // This will ensure the private key and public key are linked
    const versionedPrivateKey = `${privateKey}\n// Version: ${keyVersion}`;

    // Encrypt the private key with the user's email as password
    // In a production app, you would use a proper password or password-derived key
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
    
    // Verify the update by fetching the user again
    const updatedUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        publicKey: true,
      },
    });
    
    console.log(`[KeyGen] Updated DB verification: ${updatedUser?.publicKey?.substring(0, 40)}...`);
    console.log(`[KeyGen] Database update successful: ${updatedUser?.publicKey === publicKey}`);

    return NextResponse.json({
      message: "Encryption keys generated successfully",
      hasKeys: true,
      timestamp: keyTimestamp,
      keyChanged: true,
    })
  } catch (error) {
    console.error("Error generating encryption keys:", error)
    return NextResponse.json(
      { error: "Failed to generate encryption keys" },
      { status: 500 }
    )
  }
} 