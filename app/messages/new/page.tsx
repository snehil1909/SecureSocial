import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import ChatList from "@/components/chat-list"
import NewChatForm from "@/components/new-chat-form"
import { GenerateKeysButton } from "@/components/generate-keys-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"

export default async function NewMessagePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
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

  // Check if user has encryption keys
  const needsKeys = !user?.publicKey || !user?.encryptedPrivateKey

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">New Message</h1>
        <Link href="/messages">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Messages
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
                You need to generate encryption keys before you can send secure messages.
              </p>
              <GenerateKeysButton variant="secondary" />
            </div>
          </div>
        </div>
      )}

      <NewChatForm currentUserId={user.id} />
    </div>
  )
}

