import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import ChatList from "@/components/chat-list"
import ChatWindow from "@/components/chat-window"
import { decryptPrivateKey } from "@/lib/crypto/keys"
import RegenerateKeysButton from "@/components/regenerate-keys-button"
import { Button } from "@/components/ui/button"
import { Ghost, Plus, KeyRound } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import CreateGroupChatForm from "@/components/create-group-chat-form"
import { GenerateKeysButton } from "@/components/generate-keys-button"

interface ConversationParticipant {
  conversation: {
    id: string;
    participants: {
      user: {
        id: string;
        name: string | null;
        image: string | null;
      };
    }[];
    messages: {
      id: string;
      content: string;
      createdAt: Date;
    }[];
  };
}

interface UserWithConversations {
  id: string;
  conversations: ConversationParticipant[];
  encryptedPrivateKey?: string;
}

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const conversations = await db.conversationUser.findMany({
    where: {
      userId: session.user.id,
    },
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
  })

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      email: true,
      encryptedPrivateKey: true,
      publicKey: true,
      updatedAt: true,
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
  }) as UserWithConversations | null;

  if (!user) {
    redirect("/login")
  }

  // Decrypt the user's private key
  let userPrivateKey = "";
  if (user.encryptedPrivateKey) {
    try {
      // Use a default password or get it from session
      const password = session.user.email || "default-password";
      //console.log(user.encryptedPrivateKey);
      userPrivateKey = decryptPrivateKey(user.encryptedPrivateKey, password);
    } catch (error) {
      //console.error("Failed to decrypt private key:", error);
    }
  }

  // Check if user has encryption keys
  const needsKeys = !user.publicKey || !user.encryptedPrivateKey

  return (
    <div className="container py-4 lg:py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Link href="/messages/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </Link>
      </div>

      {needsKeys && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <KeyRound className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 mb-1">Generate Encryption Keys</h3>
              <p className="text-amber-700 text-sm mb-3">
                You need to generate encryption keys to send and receive secure messages.
              </p>
              <GenerateKeysButton variant="secondary" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <CreateGroupChatForm currentUserId={session.user.id} />
          
          <div className="w-1/3 border-r border-border">
            <ChatList conversations={user.conversations.map((p: ConversationParticipant) => p.conversation)} currentUserId={user.id} />
          </div>
        </div>

        <div className="bg-muted p-8 rounded-lg flex flex-col items-center justify-center text-center">
          <div className="bg-background rounded-full p-4 mb-4">
            <Ghost className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
          <p className="text-muted-foreground max-w-sm mb-4">
            Select a conversation from the list or start a new one to begin chatting securely with end-to-end encryption.
          </p>
          <p className="text-xs text-muted-foreground">
            All messages are secured with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  )
}

