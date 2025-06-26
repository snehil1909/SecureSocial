import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createBlockchainMessage, encryptMessage } from "@/lib/crypto/message-chain"
import { decryptPrivateKey } from "@/lib/crypto/keys"

// Change member role (promote to admin or demote to member)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { conversationId, userId, role } = body

    if (!conversationId || !userId || !role) {
      return NextResponse.json({ 
        error: "Conversation ID, user ID, and role are required" 
      }, { status: 400 })
    }

    if (role !== "ADMIN" && role !== "MEMBER") {
      return NextResponse.json({ 
        error: "Role must be ADMIN or MEMBER" 
      }, { status: 400 })
    }

    // Check if conversation exists and is a group
    const conversation = await db.conversation.findUnique({
      where: { 
        id: conversationId,
        isGroup: true,
      },
      include: {
        participants: true
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: "Group conversation not found" }, { status: 404 })
    }

    // Check if current user is admin or owner
    const currentUserParticipant = conversation.participants.find(
      p => p.userId === session.user.id
    )
    
    if (!currentUserParticipant) {
      return NextResponse.json({ error: "You're not a member of this group" }, { status: 403 })
    }

    if (currentUserParticipant.role !== "OWNER" && 
        currentUserParticipant.role !== "ADMIN" && 
        !conversation.adminIds.includes(session.user.id)) {
      return NextResponse.json({ 
        error: "You don't have permission to change member roles" 
      }, { status: 403 })
    }

    // Check if target user exists in the group
    const targetUserParticipant = conversation.participants.find(
      p => p.userId === userId
    )

    if (!targetUserParticipant) {
      return NextResponse.json({ error: "User is not a member of this group" }, { status: 404 })
    }

    // Owner can only be assigned by database admin, not through API
    if (targetUserParticipant.role === "OWNER") {
      return NextResponse.json({ 
        error: "Cannot change role of the group owner" 
      }, { status: 403 })
    }

    // Check if current user can modify the target user's role
    if (currentUserParticipant.role !== "OWNER" && targetUserParticipant.role === "ADMIN") {
      return NextResponse.json({ 
        error: "Only the group owner can change an admin's role" 
      }, { status: 403 })
    }

    // Update user's role
    await db.conversationUser.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      },
      data: {
        role
      }
    })

    // Also update adminIds array in the conversation if necessary
    if (role === "ADMIN") {
      // Add to adminIds if not already there
      if (!conversation.adminIds.includes(userId)) {
        await db.conversation.update({
          where: { id: conversationId },
          data: {
            adminIds: {
              push: userId
            }
          }
        })
      }
    } else if (role === "MEMBER") {
      // Remove from adminIds if present
      if (conversation.adminIds.includes(userId)) {
        await db.conversation.update({
          where: { id: conversationId },
          data: {
            adminIds: conversation.adminIds.filter(id => id !== userId)
          }
        })
      }
    }

    // Get session key and create system message
    try {
      // Get current user to decrypt private key
      const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          encryptedPrivateKey: true,
        }
      })

      // Get target user for name
      const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
        }
      })

      if (!currentUser?.encryptedPrivateKey || !targetUser) {
        throw new Error("Required user data not found")
      }

      // Decrypt private key
      const password = typeof currentUser.email === 'string' ? currentUser.email : "default-password"
      const privateKey = decryptPrivateKey(currentUser.encryptedPrivateKey, password)

      // Get session key from currentUserParticipant
      let sessionKey
      if (currentUserParticipant.encryptedSessionKey) {
        const { decryptSessionKey } = await import("@/lib/crypto/message-chain")
        sessionKey = decryptSessionKey(currentUserParticipant.encryptedSessionKey, privateKey)
      } else {
        throw new Error("Session key not available")
      }

      // Create system message
      const actionText = role === "ADMIN" ? "promoted to admin" : "changed to member"
      const systemMessage = `${currentUser.name || 'User'} ${actionText} ${targetUser.name || 'User'}`
      
      // Get the last message for the hash chain
      const lastMessage = await db.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { hash: true }
      })
      
      const previousHash = lastMessage?.hash || "0000000000000000000000000000000000000000000000000000000000000000"
      
      // Create blockchain message
      const blockchainMessage = createBlockchainMessage(
        systemMessage,
        session.user.id,
        previousHash,
        privateKey,
      )
      
      // Encrypt content with session key
      const encryptedContent = encryptMessage(systemMessage, sessionKey)
      
      // Store system message
      await db.message.create({
        data: {
          id: blockchainMessage.id,
          conversationId,
          senderId: session.user.id,
          content: encryptedContent,
          signature: blockchainMessage.signature,
          previousHash: blockchainMessage.previousHash,
          hash: blockchainMessage.hash,
          timestamp: new Date(blockchainMessage.timestamp),
        },
      })
    } catch (error) {
      console.error("Error creating system message:", error)
      // Non-critical error, continue
    }

    return NextResponse.json({
      message: `User role updated to ${role}`,
      conversationId,
      userId
    })
  } catch (error) {
    console.error("Failed to update user role:", error)
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 })
  }
}

// Remove a member from the group
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Parse query parameters
  const url = new URL(req.url)
  const conversationId = url.searchParams.get("conversationId")
  const userId = url.searchParams.get("userId")

  if (!conversationId || !userId) {
    return NextResponse.json({ 
      error: "Conversation ID and user ID are required" 
    }, { status: 400 })
  }

  try {
    // Check if conversation exists and is a group
    const conversation = await db.conversation.findUnique({
      where: { 
        id: conversationId,
        isGroup: true,
      },
      include: {
        participants: true
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: "Group conversation not found" }, { status: 404 })
    }

    // User can remove themselves, or admins/owner can remove others
    const isCurrentUser = userId === session.user.id
    const currentUserParticipant = conversation.participants.find(
      p => p.userId === session.user.id
    )
    
    if (!currentUserParticipant) {
      return NextResponse.json({ error: "You're not a member of this group" }, { status: 403 })
    }

    // Target user
    const targetUserParticipant = conversation.participants.find(
      p => p.userId === userId
    )

    if (!targetUserParticipant) {
      return NextResponse.json({ error: "User is not a member of this group" }, { status: 404 })
    }

    // Check permissions
    const hasPermission = isCurrentUser || 
                          currentUserParticipant.role === "OWNER" || 
                          (currentUserParticipant.role === "ADMIN" && targetUserParticipant.role === "MEMBER") ||
                          conversation.adminIds.includes(session.user.id)

    if (!hasPermission) {
      return NextResponse.json({ 
        error: "You don't have permission to remove this user" 
      }, { status: 403 })
    }

    // Can't remove the owner
    if (targetUserParticipant.role === "OWNER") {
      return NextResponse.json({ 
        error: "Cannot remove the group owner" 
      }, { status: 403 })
    }

    // Remove user from the group
    await db.conversationUser.delete({
      where: {
        userId_conversationId: {
          userId,
          conversationId
        }
      }
    })

    // If the user was an admin, remove from adminIds array
    if (conversation.adminIds.includes(userId)) {
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          adminIds: conversation.adminIds.filter(id => id !== userId)
        }
      })
    }

    // Get session key and create system message
    try {
      // Get current user to decrypt private key
      const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          encryptedPrivateKey: true,
        }
      })

      // Get target user for name
      const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
        }
      })

      if (!currentUser?.encryptedPrivateKey || !targetUser) {
        throw new Error("Required user data not found")
      }

      // Decrypt private key
      const password = typeof currentUser.email === 'string' ? currentUser.email : "default-password"
      const privateKey = decryptPrivateKey(currentUser.encryptedPrivateKey, password)

      // Get session key from currentUserParticipant
      let sessionKey
      if (currentUserParticipant.encryptedSessionKey) {
        const { decryptSessionKey } = await import("@/lib/crypto/message-chain")
        sessionKey = decryptSessionKey(currentUserParticipant.encryptedSessionKey, privateKey)
      } else {
        throw new Error("Session key not available")
      }

      // Create system message
      let systemMessage
      if (isCurrentUser) {
        systemMessage = `${currentUser.name || 'User'} left the group`
      } else {
        systemMessage = `${currentUser.name || 'User'} removed ${targetUser.name || 'User'} from the group`
      }
      
      // Get the last message for the hash chain
      const lastMessage = await db.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { hash: true }
      })
      
      const previousHash = lastMessage?.hash || "0000000000000000000000000000000000000000000000000000000000000000"
      
      // Create blockchain message
      const blockchainMessage = createBlockchainMessage(
        systemMessage,
        session.user.id,
        previousHash,
        privateKey,
      )
      
      // Encrypt content with session key
      const encryptedContent = encryptMessage(systemMessage, sessionKey)
      
      // Store system message
      await db.message.create({
        data: {
          id: blockchainMessage.id,
          conversationId,
          senderId: session.user.id,
          content: encryptedContent,
          signature: blockchainMessage.signature,
          previousHash: blockchainMessage.previousHash,
          hash: blockchainMessage.hash,
          timestamp: new Date(blockchainMessage.timestamp),
        },
      })
    } catch (error) {
      console.error("Error creating system message:", error)
      // Non-critical error, continue
    }

    return NextResponse.json({
      message: isCurrentUser ? "You left the group" : "User removed from group",
      conversationId,
      userId
    })
  } catch (error) {
    console.error("Failed to remove user from group:", error)
    return NextResponse.json({ error: "Failed to remove user from group" }, { status: 500 })
  }
} 