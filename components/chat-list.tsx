"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface ChatListProps {
  conversations: any[]
  currentUserId: string
}

export default function ChatList({ conversations, currentUserId }: ChatListProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true

    // For group chats, search by name
    if (conversation.isGroup && conversation.name) {
      return conversation.name.toLowerCase().includes(searchQuery.toLowerCase())
    }

    // For direct messages, search by other user's name
    const otherUser = conversation.participants.find((p: any) => p.userId !== currentUserId)?.user

    return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleNewChat = () => {
    router.push("/messages/new")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button size="icon" onClick={handleNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No conversations found</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation) => {
              const isActive = pathname === `/messages/${conversation.id}`

              // Determine the display name and avatar
              let displayName
              let avatarSrc
              let avatarFallback

              if (conversation.isGroup) {
                displayName = conversation.name || "Group Chat"
                avatarSrc = conversation.image || "/placeholder.svg"
                avatarFallback = "GC"
              } else {
                const otherUser = conversation.participants.find((p: any) => p.userId !== currentUserId)?.user

                displayName = otherUser?.name || "Unknown User"
                avatarSrc = otherUser?.image || "/placeholder.svg"
                avatarFallback = otherUser?.name
                  ? otherUser.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                  : "U"
              }

              // Get the last message
              const lastMessage = conversation.messages[0]

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className={cn("flex items-center p-4 hover:bg-muted/50 transition-colors", isActive && "bg-muted")}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate">{displayName}</h3>
                      {lastMessage && (
                        <span className="text-xs text-muted-foreground">{formatDate(lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {lastMessage
                        ? lastMessage.content.length > 30
                          ? `${lastMessage.content.substring(0, 30)}...`
                          : lastMessage.content
                        : "No messages yet"}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

