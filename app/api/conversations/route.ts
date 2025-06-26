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
    const { userId, message } = body

    if (!userId || !message?.trim()) {
      return NextResponse.json({ error: "User ID and message are required" }, { status: 400 })
    }

    // Check if user exists
    const otherUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        publicKey: true,
        name: true,
        email: true,
      }
    })

    if (!otherUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if the other user has a public key
    if (!otherUser.publicKey) {
      return NextResponse.json({ 
        error: "The other user has not generated encryption keys yet",
        otherUserName: otherUser.name || otherUser.email
      }, { status: 400 })
    }

    // Get current user with public and encrypted private key
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        publicKey: true,
        encryptedPrivateKey: true,
        email: true,
      }
    })

    if (!currentUser || !currentUser.publicKey || !currentUser.encryptedPrivateKey) {
      return NextResponse.json({ error: "Current user keys not found" }, { status: 400 })
    }

    // Decrypt the private key
    const password = typeof currentUser.email === 'string' ? currentUser.email : "default-password";
    let privateKey;
    try {
      privateKey = decryptPrivateKey(currentUser.encryptedPrivateKey, password);
    } catch (error) {
      console.error("Failed to decrypt private key:", error);
      return NextResponse.json({ error: "Failed to decrypt private key" }, { status: 500 })
    }

    // Generate session key
    const sessionKey = generateSessionKey();

    // Encrypt session key for each participant
    try {
      console.log("Encrypting session key for users:", {
        currentUserId: currentUser.id,
        otherUserId: otherUser.id
      });
      
      const currentUserEncryptedSessionKey = encryptSessionKey(sessionKey, currentUser.publicKey);
      const otherUserEncryptedSessionKey = encryptSessionKey(sessionKey, otherUser.publicKey);

      // Create conversation with encrypted session keys
      console.log("Creating conversation with encrypted session keys");
      const conversation = await db.conversation.create({
        data: {
          // Connect the creator to the current user
          creator: {
            connect: { id: session.user.id }
          },
          participants: {
            create: [
              { 
                userId: session.user.id,
                encryptedSessionKey: currentUserEncryptedSessionKey
              }, 
              { 
                userId: otherUser.id,
                encryptedSessionKey: otherUserEncryptedSessionKey
              }
            ],
          }
        },
        include: {
          participants: true
        }
      });
      
      console.log("Conversation created, generating genesis message");

      // Create genesis block
      try {
        console.log("Using private key to create blockchain message, privateKey length:", privateKey.length);
        const genesisMessage = createBlockchainMessage(
          message,
          session.user.id,
          "0000000000000000000000000000000000000000000000000000000000000000", // genesis block
          privateKey,
        );
        
        console.log("Blockchain message created, encrypting content");
        // Encrypt content with session key
        const encryptedContent = encryptMessage(message, sessionKey);
        
        // Store first message
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
        });
        
        console.log("Conversation successfully created with first message");
        return NextResponse.json({
          conversationId: conversation.id,
          message: "Conversation created successfully",
        });
      } catch (blockchainError: any) {
        console.error("Error creating blockchain message:", blockchainError);
        return NextResponse.json({ 
          error: "Failed to create conversation message", 
          details: blockchainError.message || "Unknown error" 
        }, { status: 500 });
      }
    } catch (error) {
      console.error("Error in conversation creation process:", error);
      return NextResponse.json({ error: "Failed to create conversation due to encryption error" }, { status: 500 })
    }
  } catch (error) {
    console.error("Failed to create conversation:", error)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }
}

