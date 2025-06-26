import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateUserKeyPair, encryptPrivateKey } from "@/lib/crypto/keys"

// NOTE: This is for development and testing purposes only!
export async function GET(req: Request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse URL to get userId
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Get the target user
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate a new key pair
    const { publicKey, privateKey } = generateUserKeyPair()
    
    // console.log("Generated key pair for user:", user.name || user.email || user.id);
    // console.log("Public key starts with:", publicKey.substring(0, 50));
    // console.log("Private key starts with:", privateKey.substring(0, 50));

    // Encrypt the private key with the user's email as password
    const password = user.email || "default-password"
    const encryptedPrivateKey = encryptPrivateKey(privateKey, password)

    // Update the user with the new keys
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        publicKey,
        encryptedPrivateKey,
      },
    })

    return NextResponse.json({
      message: `Generated encryption keys for user ${user.id}`,
      userId: user.id,
      success: true,
    })
  } catch (error) {
    console.error("Error generating encryption keys:", error)
    return NextResponse.json(
      { error: "Failed to generate encryption keys" },
      { status: 500 }
    )
  }
} 