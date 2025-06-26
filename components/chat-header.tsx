import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getOtherParticipant } from "@/lib/utils"
import GroupChatSettings from "@/components/group-chat-settings"

interface Participant {
  userId: string
  user: {
    name: string | null
    email: string
    image: string | null
  }
  role?: string
}

interface Conversation {
  id: string
  name: string | null
  isGroup: boolean
  image: string | null
  adminIds?: string[]
  creatorId?: string
  participants: Participant[]
}

interface ChatHeaderProps {
  conversation: Conversation
  currentUserId: string
}

export default function ChatHeader({ conversation, currentUserId }: ChatHeaderProps) {
  const otherUser = !conversation.isGroup 
    ? getOtherParticipant(conversation, currentUserId) 
    : null

  return (
    <div className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {conversation.isGroup ? (
          // Group chat avatar
          <Avatar className="h-8 w-8">
            <AvatarImage src={conversation.image || undefined} />
            <AvatarFallback>
              {(conversation.name?.[0] || "G").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          // One-on-one chat avatar
          <Avatar className="h-8 w-8">
            <AvatarImage src={otherUser?.user.image || undefined} />
            <AvatarFallback>
              {otherUser ? (otherUser.user.name?.[0] || otherUser.user.email[0]).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
        )}

        <div>
          {conversation.isGroup ? (
            // Group chat name and member count
            <>
              <div className="font-semibold">
                {conversation.name || "Group Chat"}
              </div>
              <div className="text-xs text-muted-foreground">
                {conversation.participants.length} members
              </div>
            </>
          ) : (
            // One-on-one chat name
            <div className="font-semibold">
              {otherUser?.user.name || otherUser?.user.email || "Unknown User"}
            </div>
          )}
        </div>
      </div>

      {/* Add settings button for group chats */}
      {conversation.isGroup && (
        <GroupChatSettings 
          currentUserId={currentUserId} 
          conversation={conversation} 
        />
      )}
    </div>
  )
} 