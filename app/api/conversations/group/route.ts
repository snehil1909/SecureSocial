import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateSessionKey, encryptSessionKey, createBlockchainMessage, encryptMessage } from "@/lib/crypto/message-chain"
import { decryptPrivateKey } from "@/lib/crypto/keys"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, userIds, initialMessage, image } = body

    if (!name?.trim() || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ 
        error: "Group name and at least one member are required" 
      }, { status: 400 })
    }

    // Validate user IDs and ensure all are valid
    const uniqueUserIds = [...new Set([...userIds, session.user.id])]
    const users = await db.user.findMany({
      where: { 
        id: { in: uniqueUserIds },
        NOT: { 
          OR: [
            { publicKey: null },
            { encryptedPrivateKey: null }
          ]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        publicKey: true,
        encryptedPrivateKey: true,
      }
    })

    // Check if all users were found and have encryption keys
    if (users.length !== uniqueUserIds.length) {
      // Find which users are missing or don't have keys
      const foundUserIds = users.map(u => u.id)
      const missingUserIds = uniqueUserIds.filter(id => !foundUserIds.includes(id))
      
      // Get details about missing users to provide better error messages
      const missingUsers = await db.user.findMany({
        where: { id: { in: missingUserIds } },
        select: { id: true, name: true, email: true, publicKey: true }
      })
      
      const usersWithoutKeys = missingUsers.filter(u => !u.publicKey)
      const nonExistentUserIds = missingUserIds.filter(id => !missingUsers.some(u => u.id === id))
      
      let errorMessage = "Some users cannot be added to secure chats"
      if (usersWithoutKeys.length > 0) {
        errorMessage = `${usersWithoutKeys.length} user(s) don't have encryption keys and cannot be added`
      } else if (nonExistentUserIds.length > 0) {
        errorMessage = "Some selected users don't exist"
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        usersWithoutKeys: usersWithoutKeys.map(u => ({ 
          id: u.id, 
          name: u.name, 
          email: u.email
        })),
        nonExistentUserIds
      }, { status: 400 })
    }

    // Get current user with public and encrypted private key
    const currentUser = users.find(u => u.id === session.user.id)
    if (!currentUser) {
      return NextResponse.json({ error: "Current user not found" }, { status: 400 })
    }

    // Decrypt the current user's private key
    const password = typeof currentUser.email === 'string' ? currentUser.email : "default-password"
    let privateKey
    try {
      privateKey = decryptPrivateKey(currentUser.encryptedPrivateKey!, password)
    } catch (error) {
      console.error("Failed to decrypt private key:", error)
      return NextResponse.json({ error: "Failed to decrypt private key" }, { status: 500 })
    }

    // Generate a single session key for the group
    const sessionKey = generateSessionKey()

    // Encrypt the session key for each participant using their public key
    const participantsData = users.map(user => {
      const encryptedKey = encryptSessionKey(sessionKey, user.publicKey!)
      return {
        userId: user.id,
        encryptedSessionKey: encryptedKey,
        role: user.id === session.user.id ? "OWNER" : "MEMBER"
      }
    })

    // Create the group conversation with all participants
    const conversation = await db.conversation.create({
      data: {
        name,
        isGroup: true,
        image,
        creator: {
          connect: { id: session.user.id }
        },
        adminIds: [session.user.id],
        participants: {
          createMany: {
            data: participantsData
          }
        }
      },
      include: {
        participants: true
      }
    })

    // Create welcome message if provided
    if (initialMessage?.trim()) {
      try {
        // Create blockchain message (genesis block)
        const genesisMessage = createBlockchainMessage(
          initialMessage,
          session.user.id,
          "0000000000000000000000000000000000000000000000000000000000000000", // genesis block
          privateKey,
        )
        
        // Encrypt content with the group session key
        const encryptedContent = encryptMessage(initialMessage, sessionKey)
        
        // Store welcome message
        await db.message.create({
          data: {
            id: genesisMessage.id,
            conversationId: conversation.id,
            senderId: session.user.id,
            content: encryptedContent,
            signature: genesisMessage.signature,
            previousHash: genesisMessage.previousHash,
            hash: genesisMessage.hash,
            timestamp: new Date(genesisMessage.timestamp),
          },
        })
      } catch (error) {
        console.error("Error creating welcome message:", error)
      }
    }

    // Create notifications for all participants
    const otherParticipants = users.filter(u => u.id !== session.user.id)
    if (otherParticipants.length > 0) {
      await db.notification.createMany({
        data: otherParticipants.map(participant => ({
          userId: participant.id,
          type: "GROUP_INVITE",
          content: `You were added to the group "${name}"`,
          referenceId: conversation.id,
        }))
      })
    }

    return NextResponse.json({
      conversationId: conversation.id,
      message: "Group conversation created successfully",
    })
  } catch (error) {
    console.error("Failed to create group conversation:", error)
    return NextResponse.json({ error: "Failed to create group conversation" }, { status: 500 })
  }
}

// API endpoint to add users to a group
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { conversationId, userIds } = body

    if (!conversationId || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Conversation ID and user IDs are required" }, { status: 400 })
    }

    // Check if conversation exists and is a group
    const conversation = await db.conversation.findUnique({
      where: { 
        id: conversationId,
        isGroup: true,
      },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: "Group conversation not found" }, { status: 404 })
    }

    // Check if current user is admin or owner
    const currentUserParticipant = conversation.participants.find(
      p => p.userId === session.user.id
    )
    
    if (!currentUserParticipant || 
        (currentUserParticipant.role !== "ADMIN" && 
         currentUserParticipant.role !== "OWNER" && 
         !conversation.adminIds.includes(session.user.id))) {
      return NextResponse.json({ error: "You don't have permission to add users to this group" }, { status: 403 })
    }

    // Fetch existing participant IDs to avoid duplicates
    const existingParticipantIds = conversation.participants.map(p => p.userId)
    const newUserIds = userIds.filter(id => !existingParticipantIds.includes(id))

    if (newUserIds.length === 0) {
      return NextResponse.json({ error: "All users are already in the group" }, { status: 400 })
    }

    // Get users to add and validate they have encryption keys
    const usersToAdd = await db.user.findMany({
      where: {
        id: { in: newUserIds },
        publicKey: { not: null }
      },
      select: {
        id: true,
        name: true,
        publicKey: true,
      }
    })

    if (usersToAdd.length !== newUserIds.length) {
      return NextResponse.json({ 
        error: "Some users don't exist or lack required encryption keys",
        foundUsers: usersToAdd.length,
        requestedUsers: newUserIds.length
      }, { status: 400 })
    }

    // Get the session key from an existing participant
    const sessionKeyHolderParticipant = conversation.participants.find(
      p => p.encryptedSessionKey && p.userId === session.user.id
    )

    if (!sessionKeyHolderParticipant?.encryptedSessionKey) {
      return NextResponse.json({ 
        error: "Could not retrieve session key for the group" 
      }, { status: 500 })
    }

    // Get current user to decrypt the session key
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        encryptedPrivateKey: true,
      }
    })

    if (!currentUser?.encryptedPrivateKey) {
      return NextResponse.json({ error: "Current user private key not found" }, { status: 400 })
    }

    // Decrypt private key and session key
    let sessionKey
    try {
      const password = typeof currentUser.email === 'string' ? currentUser.email : "default-password"
      const privateKey = decryptPrivateKey(currentUser.encryptedPrivateKey, password)
      
      // Import the function to decrypt the session key
      const { decryptSessionKey } = await import("@/lib/crypto/message-chain")
      sessionKey = decryptSessionKey(sessionKeyHolderParticipant.encryptedSessionKey, privateKey)
    } catch (error) {
      console.error("Failed to decrypt session key:", error)
      return NextResponse.json({ error: "Failed to decrypt session key" }, { status: 500 })
    }

    // Encrypt session key for new participants
    const newParticipantsData = usersToAdd.map(user => {
      const encryptedKey = encryptSessionKey(sessionKey, user.publicKey!)
      return {
        userId: user.id,
        conversationId,
        encryptedSessionKey: encryptedKey,
        role: "MEMBER"
      }
    })

    // Add new participants to the conversation
    await db.conversationUser.createMany({
      data: newParticipantsData
    })

    // Create system message about new members
    try {
      const newUserNames = usersToAdd.map(u => u.name || 'User').join(', ')
      const systemMessage = `${session.user.name || 'User'} added ${newUserNames} to the group`
      
      // Get the current user's private key again (we already have it from above but being explicit)
      const password = typeof currentUser.email === 'string' ? currentUser.email : "default-password"
      const privateKey = decryptPrivateKey(currentUser.encryptedPrivateKey, password)
      
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

    // Create notifications for new participants
    await db.notification.createMany({
      data: newUserIds.map(userId => ({
        userId,
        type: "GROUP_INVITE",
        content: `You were added to the group "${conversation.name || 'Group Chat'}"`,
        referenceId: conversationId,
      }))
    })

    return NextResponse.json({
      message: "Users added to group successfully",
      addedUsers: usersToAdd.length,
      conversationId
    })
  } catch (error) {
    console.error("Failed to add users to group:", error)
    return NextResponse.json({ error: "Failed to add users to group" }, { status: 500 })
  }
} 