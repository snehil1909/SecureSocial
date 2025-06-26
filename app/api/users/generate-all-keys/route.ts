import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateUserKeyPair, encryptPrivateKey } from "@/lib/crypto/keys"

// NOTE: This is for development and testing purposes only!
// In a real application, keys should only be generated for the authenticated user.
export async function GET(req: Request) {
  try {
    // Get the current session (admin check would be good in production)
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse URL to check for resetAll parameter
    const url = new URL(req.url)
    const resetAll = url.searchParams.get('resetAll') === 'true'

    // Find users that need keys
    let usersToUpdate;
    
    if (resetAll) {
      // Reset keys for all users if resetAll=true
      usersToUpdate = await db.user.findMany({
        select: {
          id: true,
          email: true,
        },
      });
    } else {
      // Otherwise, only update users without keys
      usersToUpdate = await db.user.findMany({
        where: {
          OR: [
            { publicKey: null },
            { encryptedPrivateKey: null }
          ]
        },
        select: {
          id: true,
          email: true,
        },
      });
    }

    if (usersToUpdate.length === 0) {
      return NextResponse.json({
        message: "No users need encryption keys updated",
        usersUpdated: 0,
      })
    }

    // Generate keys for each user
    const updatedUsers = []
    for (const user of usersToUpdate) {
      try {
        // Generate a new key pair
        const { publicKey, privateKey } = generateUserKeyPair()

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

        updatedUsers.push(user.id)
      } catch (error) {
        console.error(`Failed to generate keys for user ${user.id}:`, error)
      }
    }

    return NextResponse.json({
      message: `Generated encryption keys for ${updatedUsers.length} users`,
      usersUpdated: updatedUsers.length,
      userIds: updatedUsers,
    })
  } catch (error) {
    console.error("Error generating encryption keys for all users:", error)
    return NextResponse.json(
      { error: "Failed to generate encryption keys" },
      { status: 500 }
    )
  }
} 