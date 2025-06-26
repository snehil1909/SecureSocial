import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user with keys
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

    if (!user.encryptedPrivateKey) {
      return NextResponse.json({ error: "No private key to update" }, { status: 400 })
    }

    // Log the original key fingerprint
    console.log(`[ClearKeyCache] User ${user.id} clearing key cache`);
    if (user.publicKey) {
      console.log(`[ClearKeyCache] Original public key prefix: ${user.publicKey.substring(0, 40)}...`);
    }
    
    // Modify the encryptedPrivateKey to ensure it's actually updated
    // This is a direct marker update to force the database to register a change
    // We'll add a timestamp marker to the end of the encrypted key string
    const timestampMarker = `_updated_${Date.now()}`;
    
    // Update the private key with timestamp marker
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        // Force an update to the private key by appending a timestamp marker
        // This ensures the database marks it as a changed field
        encryptedPrivateKey: user.encryptedPrivateKey + timestampMarker,
        // Also force update timestamp
        updatedAt: new Date(),
      },
    })
    
    // Now immediately call the key regeneration to replace the temporarily modified key
    // with a completely new keypair
    
    // This two-step process ensures that:
    // 1. The database definitely sees a change in the key
    // 2. We end up with a proper new key pair after regeneration
    
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/users/keypair?reset=true&t=${Date.now()}`, {
      method: "GET",
      headers: {
        Cookie: req.headers.get('cookie') || '',
      },
    });
    
    if (!response.ok) {
      throw new Error("Failed to regenerate keys after clearing cache");
    }
    
    // Verify that keys were changed by getting the latest user record
    const updatedUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        publicKey: true,
        encryptedPrivateKey: true,
        updatedAt: true,
      },
    });
    
    // Check if the key was successfully changed
    const keyChanged = updatedUser?.encryptedPrivateKey !== user.encryptedPrivateKey;
    // console.log(`[ClearKeyCache] Key changed: ${keyChanged}`);
    if (updatedUser?.publicKey) {
      console.log(`[ClearKeyCache] New public key prefix: ${updatedUser.publicKey.substring(0, 40)}...`);
    }

    return NextResponse.json({
      message: "Key cache cleared and keys regenerated successfully",
      success: true,
      keyChanged,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error clearing key cache:", error)
    return NextResponse.json(
      { error: "Failed to clear key cache" },
      { status: 500 }
    )
  }
} 