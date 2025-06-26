import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import ChatList from "@/components/chat-list"
import ChatWindow from "@/components/chat-window"
import { decryptPrivateKey, calculateKeyFingerprint } from "@/lib/crypto/keys"
import RegenerateKeysButton from "@/components/regenerate-keys-button"
import { KeyStatusCard } from "@/components/key-status-card"
import { getOtherParticipant } from "@/lib/utils"

interface ConversationParticipant {
  conversation: {
    id: string;
    participants: any[];
    messages: any[];
  };
}

export default async function ConversationPage({
  params,
}: {
  params: { conversationId: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }
  
  const parameters = await params
  
  // Add timestamp to searchParams to avoid database caching
  const timestamp = new Date().toISOString();
  
  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      email: true,
      encryptedPrivateKey: true,
      updatedAt: true, // Include updated timestamp to check key freshness
      conversations: {
        include: {
          conversation: {
            include: {
              participants: {
                include: {
                  user: true,
                },
              },
              messages: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Fix: Access the conversation ID correctly
  const isParticipant = (user.conversations as ConversationParticipant[]).some(
    (conv) => conv.conversation.id === parameters.conversationId
  )

  if (!isParticipant) {
    notFound()
  }

  const conversation = await db.conversation.findUnique({
    where: {
      id: parameters.conversationId,
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: true,
          attachments: true,
        },
      },
    },
  })

  if (!conversation) {
    notFound()
  }

  // Decrypt the user's private key
  let userPrivateKey = "";
  let keyFingerprint = "";
  let decryptError = null;
  
  if (user.encryptedPrivateKey) {
    try {
      // Use a default password or get it from session
      const password = session.user.email || "default-password";
      
      // Log attempt to decrypt key
      //console.log(`[PageLoad ${timestamp}] Attempting to decrypt private key for user ${user.id}`);
      //console.log(`[PageLoad] User last updated: ${user.updatedAt}`);
      //console.log(`[PageLoad] Encrypted private key length: ${user.encryptedPrivateKey.length}`);
      
      // Look for any timestamp markers that might have been added
      const markerPosition = user.encryptedPrivateKey.indexOf('_updated_');
      if (markerPosition > 0) {
        //console.log(`[PageLoad] Found timestamp marker in private key, it will be removed during decryption`);
      }
      //console.log("loggin user's encrypted privaate key");
      //console.log(user.encryptedPrivateKey);
      userPrivateKey = decryptPrivateKey(user.encryptedPrivateKey, password);
      //console.log("Decrypted key : ", userPrivateKey);
      // Verify successful decryption and calculate fingerprint
      if (userPrivateKey && userPrivateKey.includes('PRIVATE KEY')) {
        keyFingerprint = calculateKeyFingerprint(userPrivateKey);
        //console.log(`[PageLoad] Successfully decrypted private key with fingerprint: ${keyFingerprint}`);
      } else {
        //console.error("[PageLoad] Decrypted key, but it doesn't have the expected format");
        decryptError = "Decrypted key has invalid format";
      }
    } catch (error: any) {
      //console.error("[PageLoad] Failed to decrypt private key:", error);
      decryptError = error.message || "Failed to decrypt private key";
      userPrivateKey = ""; // Ensure private key is cleared on error
    }
  }

  // Add check for the other user's information in a one-to-one chat
  const otherUser = !conversation.isGroup 
    ? getOtherParticipant(conversation, session.user.id) 
    : null

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r border-border">
        <ChatList 
          conversations={(user.conversations as ConversationParticipant[]).map((p) => p.conversation)} 
          currentUserId={user.id} 
        />
      </div>
      <div className="w-2/3">
        <RegenerateKeysButton />
        {decryptError && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-4 text-sm text-red-800">
            <h4 className="font-medium">Error decrypting your private key</h4>
            <p>{decryptError}</p>
            <p className="text-xs mt-1">Please try regenerating your keys using the button above.</p>
          </div>
        )}
        
        {/* Add key status warning for one-to-one chats */}
        {!conversation.isGroup && otherUser && (
          <KeyStatusCard userId={otherUser.userId} userName={otherUser.user.name} />
        )}
        
        <ChatWindow 
          currentUserId={user.id} 
          conversation={conversation} 
          userPrivateKey={userPrivateKey}
          keyFingerprint={keyFingerprint}
          pageLoadTime={timestamp}
        />
      </div>
    </div>
  )
}

