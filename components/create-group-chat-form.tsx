"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Search, X, Users, UserPlus, Shield, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/spinner"

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  hasKeys: boolean
}

interface CreateGroupChatFormProps {
  currentUserId: string
}

export default function CreateGroupChatForm({ currentUserId }: CreateGroupChatFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [initialMessage, setInitialMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const { toast } = useToast()
  const router = useRouter()

  // Function to search for users
  const searchUsers = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error("Failed to search users")
      }
      
      const data = await response.json()
      
      // Filter out current user and already selected users
      const filteredResults = data.users
        .filter((user: User) => user.id !== currentUserId && !selectedUsers.some(u => u.id === user.id))
      
      setSearchResults(filteredResults)
    } catch (error) {
      console.error("Error searching users:", error)
      toast({
        title: "Error",
        description: "Failed to search for users",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search when query changes - reduced debounce time for more responsiveness
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 200) // Reduced from 500ms to 200ms for more responsiveness

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Select a user
  const selectUser = (user: User) => {
    if (!user.hasKeys) {
      toast({
        title: "Cannot add user",
        description: "This user doesn't have encryption keys set up and cannot be added to secure chats.",
        variant: "destructive",
      })
      return
    }
    
    setSelectedUsers([...selectedUsers, user])
    setSearchResults(searchResults.filter(u => u.id !== user.id))
    setSearchQuery("")
  }

  // Remove a selected user
  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId))
  }

  // Create group chat
  const createGroupChat = async () => {
    if (!name.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for your group chat",
        variant: "destructive",
      })
      return
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "Add members",
        description: "Please add at least one person to the group",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/conversations/group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          userIds: selectedUsers.map(user => user.id),
          initialMessage: initialMessage.trim() || `${name} group created`
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create group chat")
      }

      const data = await response.json()
      
      toast({
        title: "Group created",
        description: "Your secure group chat has been created",
      })

      // Close dialog and reset form
      setIsOpen(false)
      resetForm()

      // Navigate to the new conversation
      router.push(`/messages/${data.conversationId}`)
      router.refresh()
    } catch (error: any) {
      console.error("Error creating group chat:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create group chat",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setName("")
    setInitialMessage("")
    setSearchQuery("")
    setSearchResults([])
    setSelectedUsers([])
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline" 
        className="w-full mb-4"
      >
        <Users className="h-4 w-4 mr-2" />
        Create Group Chat
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group Chat</DialogTitle>
            <DialogDescription>
              Create a secure encrypted group chat with your contacts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Add Members</Label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for users"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map(user => (
                    <Badge key={user.id} variant="secondary" className="gap-1 pl-1">
                      <Avatar className="h-5 w-5 mr-1">
                        <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                        <AvatarFallback>{(user.name || user.email)[0]}</AvatarFallback>
                      </Avatar>
                      {user.name || user.email}
                      <button 
                        type="button"
                        onClick={() => removeUser(user.id)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search results */}
              {isSearching ? (
                <div className="flex justify-center p-2">
                  <Spinner />
                </div>
              ) : (
                searchResults.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {searchResults.map(user => (
                      <div
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                          <AvatarFallback>{(user.name || user.email)[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || "User"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {!user.hasKeys && (
                          <div className="flex items-center text-amber-500 text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            No keys
                          </div>
                        )}
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Welcome Message (Optional)</Label>
              <Textarea
                id="message"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Enter an optional welcome message"
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="flex space-x-2 sm:justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                resetForm()
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={createGroupChat} 
              disabled={isLoading || selectedUsers.length === 0 || !name.trim()}
            >
              {isLoading ? <Spinner className="mr-2" /> : null}
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 